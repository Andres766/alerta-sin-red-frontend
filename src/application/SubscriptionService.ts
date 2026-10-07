import type { SubscriptionRequest, SubscriptionResponse } from '../domain/types'
import { NetworkError, type ApiClient } from '../infrastructure/http/ApiClient'
import type { OutboxRepository } from '../infrastructure/storage/OutboxRepository'

export type SubscriptionOutcome =
  | { status: 'sent'; response: SubscriptionResponse }
  | { status: 'queued' }

export interface SyncScheduler {
  /** Pide al navegador que vacíe la bandeja cuando vuelva la conexión. */
  schedule(): Promise<boolean>
}

/** Usa la Background Sync API si existe; si no, devuelve false (se usa el evento online). */
export class BackgroundSyncScheduler implements SyncScheduler {
  static readonly TAG = 'outbox-sync'

  async schedule(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false
    try {
      const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register(tag: string): Promise<void> }
      }
      if (!registration.sync) return false
      await registration.sync.register(BackgroundSyncScheduler.TAG)
      return true
    } catch {
      return false
    }
  }
}

export class SubscriptionService {
  constructor(
    private readonly api: ApiClient,
    private readonly outbox: OutboxRepository,
    private readonly scheduler: SyncScheduler,
  ) {}

  async subscribe(request: SubscriptionRequest): Promise<SubscriptionOutcome> {
    try {
      const response = await this.api.post<SubscriptionResponse>('/subscriptions', request)
      return { status: 'sent', response }
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error // errores de validación: mostrar
      await this.outbox.enqueueSubscription(request)
      await this.scheduler.schedule()
      return { status: 'queued' }
    }
  }
}
