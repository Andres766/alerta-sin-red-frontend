import type { CancelRequest, SubscriptionRequest } from '../../domain/types'
import type { AppDatabase, OutboxItem } from './database'

/**
 * Bandeja de salida (patrón Outbox): las acciones hechas sin conexión se
 * guardan aquí y se envían cuando vuelve la red.
 */
export class OutboxRepository {
  constructor(private readonly db: () => Promise<AppDatabase>) {}

  enqueueSubscription(payload: SubscriptionRequest): Promise<number> {
    return this.add({ kind: 'subscription', payload })
  }

  enqueueCancel(payload: CancelRequest): Promise<number> {
    return this.add({ kind: 'cancel', payload })
  }

  async pending(): Promise<OutboxItem[]> {
    return (await this.db()).getAllFromIndex('outbox', 'byCreatedAt')
  }

  async remove(id: number): Promise<void> {
    await (await this.db()).delete('outbox', id)
  }

  async markFailed(item: OutboxItem, error: string): Promise<void> {
    await (await this.db()).put('outbox', { ...item, attempts: item.attempts + 1, lastError: error })
  }

  private async add(action: Pick<OutboxItem, 'kind' | 'payload'>): Promise<number> {
    const item = { ...action, createdAt: new Date().toISOString(), attempts: 0 } as OutboxItem
    return (await this.db()).add('outbox', item)
  }
}
