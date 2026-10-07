import { distanceKm, type LatLon } from '../domain/geo'
import type { DataSource, NearbyZone, RiskSnapshot } from '../domain/types'
import { ApiError, NetworkError, type ApiClient } from '../infrastructure/http/ApiClient'
import type { SnapshotRepository } from '../infrastructure/storage/SnapshotRepository'

export interface SnapshotResult {
  snapshot: RiskSnapshot
  source: DataSource
  savedAt: string
}

export class NoDataAvailableError extends Error {
  constructor() {
    super('No hay datos guardados todavía. Conéctese al menos una vez para descargarlos.')
    this.name = 'NoDataAvailableError'
  }
}

/**
 * Estrategia "network-first con respaldo local":
 *  1. Intenta traer el estado fresco del servidor y lo guarda en IndexedDB.
 *  2. Si no hay red (o el servidor falla), responde con lo último guardado.
 * Así la alerta se puede consultar justo cuando más falta hace: sin señal.
 */
export class RiskService {
  constructor(
    private readonly api: ApiClient,
    private readonly snapshots: SnapshotRepository,
  ) {}

  async getCached(): Promise<SnapshotResult | null> {
    const stored = await this.snapshots.load()
    return stored ? { snapshot: stored.snapshot, source: 'cache', savedAt: stored.savedAt } : null
  }

  async refresh(): Promise<SnapshotResult> {
    try {
      const snapshot = await this.api.get<RiskSnapshot>('/risk/snapshot')
      await this.snapshots.save(snapshot)
      return { snapshot, source: 'network', savedAt: new Date().toISOString() }
    } catch (error) {
      if (!RiskService.isRecoverable(error)) throw error
      const cached = await this.getCached()
      if (!cached) throw new NoDataAvailableError()
      return cached
    }
  }

  /** En línea usa PostGIS en el servidor; sin conexión calcula en el dispositivo. */
  async nearby(position: LatLon, radiusKm = 50): Promise<{ zones: NearbyZone[]; source: DataSource }> {
    try {
      const params = new URLSearchParams({
        lat: position.latitude.toFixed(5),
        lon: position.longitude.toFixed(5),
        radius_km: String(radiusKm),
      })
      const zones = await this.api.get<NearbyZone[]>(`/zones/nearby?${params}`)
      return { zones, source: 'network' }
    } catch (error) {
      if (!RiskService.isRecoverable(error)) throw error
      const cached = await this.getCached()
      if (!cached) throw new NoDataAvailableError()
      const zones = cached.snapshot.items
        .map(({ zone }) => ({ zone, distance_km: distanceKm(position, zone) }))
        .filter((z) => z.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km)
      return { zones, source: 'cache' }
    }
  }

  private static isRecoverable(error: unknown): boolean {
    return error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)
  }
}
