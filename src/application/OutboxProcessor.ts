import type { SubscriptionResponse } from '../domain/types'
import { ApiError, NetworkError, type ApiClient } from '../infrastructure/http/ApiClient'
import type { OutboxRepository } from '../infrastructure/storage/OutboxRepository'

export interface FlushResult {
  sent: number
  rejected: string[]
  remaining: number
  /** true si se detuvo por falta de conexión (quedan pendientes). */
  offline: boolean
}

/**
 * Vacía la bandeja de salida. Lo ejecuta el Service Worker (Background Sync)
 * o la página al detectar el evento `online` (respaldo para navegadores sin
 * Background Sync, como Firefox y Safari). Es seguro ejecutarlo varias veces:
 * el backend trata la suscripción de forma idempotente.
 */
export class OutboxProcessor {
  private running: Promise<FlushResult> | null = null

  constructor(
    private readonly api: ApiClient,
    private readonly outbox: OutboxRepository,
    private readonly maxAttempts = 8,
  ) {}

  flush(): Promise<FlushResult> {
    // Evita dos vaciados simultáneos (p. ej. evento online + sync del SW).
    this.running ??= this.doFlush().finally(() => (this.running = null))
    return this.running
  }

  private async doFlush(): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, rejected: [], remaining: 0, offline: false }
    const items = await this.outbox.pending()

    for (const [index, item] of items.entries()) {
      if (item.id === undefined) continue
      try {
        await this.api.post<SubscriptionResponse>('/subscriptions', item.payload)
        await this.outbox.remove(item.id)
        result.sent++
      } catch (error) {
        if (error instanceof NetworkError) {
          // Sigue sin red: no tiene sentido intentar el resto ahora.
          result.remaining += items.length - index
          result.offline = true
          return result
        }
        const permanent = error instanceof ApiError && error.isPermanent
        if (permanent || item.attempts + 1 >= this.maxAttempts) {
          await this.outbox.remove(item.id)
          result.rejected.push(error instanceof Error ? error.message : 'Error desconocido')
        } else {
          await this.outbox.markFailed(item, error instanceof Error ? error.message : 'Error')
          result.remaining++
        }
      }
    }
    return result
  }
}
