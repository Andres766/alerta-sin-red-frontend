import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { distanceKm } from '../domain/geo'
import type { RiskSnapshot, SubscriptionRequest } from '../domain/types'
import { ApiClient, ApiError } from '../infrastructure/http/ApiClient'
import { getDatabase } from '../infrastructure/storage/database'
import { OutboxRepository } from '../infrastructure/storage/OutboxRepository'
import { SnapshotRepository } from '../infrastructure/storage/SnapshotRepository'
import { OutboxProcessor } from './OutboxProcessor'
import { NoDataAvailableError, RiskService } from './RiskService'
import { SubscriptionService, type SyncScheduler } from './SubscriptionService'

/** Red simulada: se puede "cortar" para reproducir la pérdida de señal. */
class FakeNetwork {
  online = true
  calls: string[] = []
  responder: (url: string, init?: RequestInit) => Response = () => json({})

  fetch: typeof fetch = async (input, init) => {
    const url = String(input)
    this.calls.push(url)
    if (!this.online) throw new TypeError('Failed to fetch')
    return this.responder(url, init)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const snapshot: RiskSnapshot = {
  generated_at: '2026-09-28T12:00:00Z',
  items: [
    {
      zone: {
        id: 'z-pasto', name: 'Pasto', municipality: 'Pasto', department: 'Nariño',
        hazard_type: 'DESLIZAMIENTO', susceptibility: 4, slope_deg: 27,
        latitude: 1.2265, longitude: -77.265,
      },
      assessment: null,
    },
    {
      zone: {
        id: 'z-mocoa', name: 'Mocoa', municipality: 'Mocoa', department: 'Putumayo',
        hazard_type: 'MIXTO', susceptibility: 5, slope_deg: 18,
        latitude: 1.15, longitude: -76.648,
      },
      assessment: null,
    },
  ],
}

const request: SubscriptionRequest = { phone: '3001234567', zone_id: 'z-pasto', accepts_data_policy: true }

let net: FakeNetwork
let api: ApiClient
const snapshots = new SnapshotRepository(getDatabase)
const outbox = new OutboxRepository(getDatabase)

beforeEach(async () => {
  net = new FakeNetwork()
  api = new ApiClient('/api/v1', net.fetch)
  const db = await getDatabase()
  await db.clear('snapshot')
  await db.clear('outbox')
})

describe('RiskService (network-first con respaldo en IndexedDB)', () => {
  it('guarda el snapshot y lo sirve cuando se pierde la conexión', async () => {
    net.responder = () => json(snapshot)
    const service = new RiskService(api, snapshots)
    expect((await service.refresh()).source).toBe('network')

    net.online = false
    const offline = await service.refresh()
    expect(offline.source).toBe('cache')
    expect(offline.snapshot.items).toHaveLength(2)
  })

  it('usa la caché si el servidor falla con 5xx', async () => {
    await snapshots.save(snapshot)
    net.responder = () => json({ detail: 'caído' }, 503)
    expect((await new RiskService(api, snapshots).refresh()).source).toBe('cache')
  })

  it('usa la caché si la plataforma responde una página HTML de error (4xx)', async () => {
    await snapshots.save(snapshot)
    net.responder = () => new Response('<html>Not Found</html>', { status: 404 })
    expect((await new RiskService(api, snapshots).refresh()).source).toBe('cache')
  })

  it('sin caché y con el servidor caído explica que puede estar despertando', async () => {
    net.responder = () => new Response('<html>Not Found</html>', { status: 404 })
    await expect(new RiskService(api, snapshots).refresh()).rejects.toThrow(/despertando/)
  })

  it('informa claramente si nunca se descargaron datos', async () => {
    net.online = false
    await expect(new RiskService(api, snapshots).refresh()).rejects.toBeInstanceOf(NoDataAvailableError)
  })

  it('calcula zonas cercanas en el dispositivo sin conexión', async () => {
    await snapshots.save(snapshot)
    net.online = false
    const { zones, source } = await new RiskService(api, snapshots).nearby(
      { latitude: 1.2136, longitude: -77.2811 },
      20,
    )
    expect(source).toBe('cache')
    expect(zones.map((z) => z.zone.id)).toEqual(['z-pasto'])
  })
})

describe('Suscripción offline (Outbox + sincronización)', () => {
  const scheduler: SyncScheduler & { scheduled: number } = {
    scheduled: 0,
    async schedule() {
      this.scheduled++
      return true
    },
  }

  it('sin red la guarda en la bandeja y pide Background Sync', async () => {
    net.online = false
    const outcome = await new SubscriptionService(api, outbox, scheduler).subscribe(request)
    expect(outcome.status).toBe('queued')
    expect(await outbox.pending()).toHaveLength(1)
    expect(scheduler.scheduled).toBe(1)
  })

  it('al volver la red envía lo pendiente y vacía la bandeja', async () => {
    await outbox.enqueueSubscription(request)
    net.responder = () => json({ id: 's1', phone_masked: '+57 300 *** **67' }, 201)
    const result = await new OutboxProcessor(api, outbox).flush()
    expect(result).toMatchObject({ sent: 1, remaining: 0, offline: false })
    expect(await outbox.pending()).toHaveLength(0)
  })

  it('si sigue sin red conserva los pendientes para reintentar', async () => {
    await outbox.enqueueSubscription(request)
    net.online = false
    const result = await new OutboxProcessor(api, outbox).flush()
    expect(result.offline).toBe(true)
    expect(await outbox.pending()).toHaveLength(1)
  })

  it('descarta solicitudes que el servidor rechaza de forma permanente (4xx)', async () => {
    await outbox.enqueueSubscription(request)
    net.responder = () => json({ code: 'zone_not_found', detail: 'Recurso no encontrado' }, 404)
    const result = await new OutboxProcessor(api, outbox).flush()
    expect(result.rejected).toEqual(['Recurso no encontrado'])
    expect(await outbox.pending()).toHaveLength(0)
  })

  it('reintenta errores transitorios (5xx) sin perder la solicitud', async () => {
    await outbox.enqueueSubscription(request)
    net.responder = () => json({}, 502)
    await new OutboxProcessor(api, outbox).flush()
    const [item] = await outbox.pending()
    expect(item?.attempts).toBe(1)
  })
})

describe('Utilidades', () => {
  it('distancia Pasto–Mocoa ≈ 70 km', () => {
    const d = distanceKm({ latitude: 1.2136, longitude: -77.2811 }, { latitude: 1.15, longitude: -76.648 })
    expect(d).toBeGreaterThan(69)
    expect(d).toBeLessThan(72)
  })

  it('clasifica errores HTTP permanentes y transitorios', () => {
    expect(new ApiError(422, 'x', '').isPermanent).toBe(true)
    expect(new ApiError(429, 'x', '').isPermanent).toBe(false)
    expect(new ApiError(503, 'x', '').isPermanent).toBe(false)
  })
})
