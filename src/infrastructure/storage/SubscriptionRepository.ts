import type { SubscriptionResponse } from '../../domain/types'
import type { AppDatabase, StoredSubscription } from './database'

/**
 * Suscripciones hechas desde este dispositivo. Guarda el código de baja que el
 * servidor entrega una sola vez: sin él no se puede cancelar la suscripción.
 */
export class SubscriptionRepository {
  constructor(private readonly db: () => Promise<AppDatabase>) {}

  /** Solo se guarda si el servidor entregó código (suscripción nueva o reactivada). */
  async saveFromResponse(response: SubscriptionResponse): Promise<void> {
    if (!response.cancel_token) return
    const record: StoredSubscription = {
      id: response.id,
      zoneId: response.zone_id,
      phoneMasked: response.phone_masked,
      cancelToken: response.cancel_token,
      createdAt: new Date().toISOString(),
    }
    await (await this.db()).put('subscriptions', record)
  }

  async list(): Promise<StoredSubscription[]> {
    const all = await (await this.db()).getAll('subscriptions')
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async get(id: string): Promise<StoredSubscription | undefined> {
    return (await this.db()).get('subscriptions', id)
  }

  async markCancelPending(id: string): Promise<void> {
    const db = await this.db()
    const current = await db.get('subscriptions', id)
    if (current) await db.put('subscriptions', { ...current, cancelPending: true })
  }

  async remove(id: string): Promise<void> {
    await (await this.db()).delete('subscriptions', id)
  }
}
