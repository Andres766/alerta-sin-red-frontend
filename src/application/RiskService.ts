import { distanceKm, type LatLon } from '../domain/geo'
import type { Assessment, DataSource, DayRisk, NearbyZone, RiskSnapshot, ZoneRisk } from '../domain/types'
import { ApiError, NetworkError, type ApiClient } from '../infrastructure/http/ApiClient'
import type { SnapshotRepository } from '../infrastructure/storage/SnapshotRepository'

export interface SnapshotResult {
  snapshot: RiskSnapshot
  source: DataSource
  savedAt: string
}

export class NoDataAvailableError extends Error {
  constructor(serverFailed = false) {
    super(
      serverFailed
        ? 'Conectando con el servidor… Si estaba en reposo puede tardar hasta un minuto; reintentamos automáticamente.'
        : 'No hay datos guardados todavía. Conéctese al menos una vez para descargarlos.',
    )
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
      if (!cached) throw new NoDataAvailableError(RiskService.serverFailed(error))
      return cached
    }
  }

  /**
   * Una zona para su página de detalle. Primero lo guardado (instantáneo y sin red);
   * si el dispositivo aún no tiene esa zona (p. ej. abrió un enlace compartido), la
   * pide al servidor. Devuelve null si la zona no existe.
   */
  async zone(zoneId: string): Promise<ZoneRisk | null> {
    if (!RiskService.isZoneId(zoneId)) return null
    const cached = await this.getCached()
    const local = cached?.snapshot.items.find((i) => i.zone.id === zoneId)
    if (local) return local
    try {
      return await this.api.get<ZoneRisk>(`/zones/${encodeURIComponent(zoneId)}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      if (RiskService.isRecoverable(error)) throw new NoDataAvailableError(RiskService.serverFailed(error))
      throw error
    }
  }

  /** Evaluaciones recientes; si no se pueden obtener, lista vacía (no es información crítica). */
  async history(zoneId: string, limit = 12): Promise<Assessment[]> {
    if (!RiskService.isZoneId(zoneId)) return []
    try {
      return await this.api.get<Assessment[]>(`/zones/${encodeURIComponent(zoneId)}/history?limit=${limit}`)
    } catch {
      return []
    }
  }

  /** Peor nivel de cada día de los últimos `days`; lista vacía si no se puede obtener. */
  async daily(zoneId: string, days = 30): Promise<DayRisk[]> {
    if (!RiskService.isZoneId(zoneId)) return []
    try {
      return await this.api.get<DayRisk[]>(`/zones/${encodeURIComponent(zoneId)}/days?days=${days}`)
    } catch {
      return []
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
      if (!cached) throw new NoDataAvailableError(RiskService.serverFailed(error))
      const zones = cached.snapshot.items
        .map(({ zone }) => ({ zone, distance_km: distanceKm(position, zone) }))
        .filter((z) => z.distance_km <= radiusKm)
        .sort((a, b) => a.distance_km - b.distance_km)
      return { zones, source: 'cache' }
    }
  }

  /**
   * Para LEER datos, cualquier fallo del servidor (caído, despertando, proxy con
   * error) se resuelve con lo guardado: mejor un dato reciente que una pantalla vacía.
   */
  private static isZoneId(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  /** ¿Falló el servidor (y no la conexión del dispositivo)? */
  private static serverFailed(error: unknown): boolean {
    const deviceOnline = typeof navigator === 'undefined' || navigator.onLine
    return error instanceof ApiError || (error instanceof NetworkError && deviceOnline)
  }

  private static isRecoverable(error: unknown): boolean {
    return error instanceof NetworkError || error instanceof ApiError
  }
}
