/**
 * Raíz de composición del frontend: único lugar donde se instancian las clases
 * concretas. Los componentes reciben servicios ya armados.
 */
import { AdminService } from './application/AdminService'
import { OutboxProcessor } from './application/OutboxProcessor'
import { RiskService } from './application/RiskService'
import { BackgroundSyncScheduler, SubscriptionService } from './application/SubscriptionService'
import { ApiClient } from './infrastructure/http/ApiClient'
import { getDatabase } from './infrastructure/storage/database'
import { OutboxRepository } from './infrastructure/storage/OutboxRepository'
import { SnapshotRepository } from './infrastructure/storage/SnapshotRepository'

export const API_BASE = '/api/v1'

const api = new ApiClient(API_BASE)
const snapshots = new SnapshotRepository(getDatabase)
export const outboxRepository = new OutboxRepository(getDatabase)

export const riskService = new RiskService(api, snapshots)
export const subscriptionService = new SubscriptionService(
  api,
  outboxRepository,
  new BackgroundSyncScheduler(),
)
export const outboxProcessor = new OutboxProcessor(api, outboxRepository)
export const adminService = new AdminService(api)
