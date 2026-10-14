import type { SubscriptionRequest, SubscriptionResponse } from '../domain/types'
import { ApiError, NetworkError, type ApiClient } from '../infrastructure/http/ApiClient'
import type { StoredSubscription } from '../infrastructure/storage/database'
import type { OutboxRepository } from '../infrastructure/storage/OutboxRepository'
import type { SubscriptionRepository } from '../infrastructure/storage/SubscriptionRepository'

export type SubscriptionOutcome =
  | { status: 'sent'; response: SubscriptionResponse }
  | { status: 'queued' }

export type CancelOutcome = 'cancelled' | 'queued'

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
    private readonly subscriptions: SubscriptionRepository,
    private readonly scheduler: SyncScheduler,
  ) {}

  async subscribe(request: SubscriptionRequest): Promise<SubscriptionOutcome> {
    try {
      const response = await this.api.post<SubscriptionResponse>('/subscriptions', request)
      await this.subscriptions.saveFromResponse(response)
      return { status: 'sent', response }
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error // errores de validación: mostrar
      await this.outbox.enqueueSubscription(request)
      await this.scheduler.schedule()
      return { status: 'queued' }
    }
  }

  mine(): Promise<StoredSubscription[]> {
    return this.subscriptions.list()
  }

  /** Baja de una suscripción hecha en este dispositivo; sin red queda en la bandeja. */
  async cancel(subscription: StoredSubscription): Promise<CancelOutcome> {
    const payload = { subscription_id: subscription.id, cancel_token: subscription.cancelToken }
    try {
      await this.api.post(`/subscriptions/${subscription.id}/cancel`, {
        cancel_token: payload.cancel_token,
      })
    } catch (error) {
      if (error instanceof NetworkError) {
        await this.outbox.enqueueCancel(payload)
        await this.subscriptions.markCancelPending(subscription.id)
        await this.scheduler.schedule()
        return 'queued'
      }
      // 404: ya estaba dada de baja (p. ej. desde otra pestaña); igual se limpia.
      if (!(error instanceof ApiError && error.status === 404)) throw error
    }
    await this.subscriptions.remove(subscription.id)
    return 'cancelled'
  }
}
