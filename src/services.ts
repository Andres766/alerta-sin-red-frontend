/**
 * Raíz de composición del frontend: único lugar donde se instancian las clases
 * concretas. Los componentes reciben servicios ya armados.
 */
import { AdminService } from './application/AdminService'
import { ModelInfoService } from './application/ModelInfoService'
import { OutboxProcessor } from './application/OutboxProcessor'
import { RiskService } from './application/RiskService'
import { BackgroundSyncScheduler, SubscriptionService } from './application/SubscriptionService'
import { ApiClient } from './infrastructure/http/ApiClient'
import { getDatabase } from './infrastructure/storage/database'
import { OutboxRepository } from './infrastructure/storage/OutboxRepository'
import { PreferencesRepository } from './infrastructure/storage/PreferencesRepository'
import { SnapshotRepository } from './infrastructure/storage/SnapshotRepository'
import { SubscriptionRepository } from './infrastructure/storage/SubscriptionRepository'

export const API_BASE = '/api/v1'

const api = new ApiClient(API_BASE)
const snapshots = new SnapshotRepository(getDatabase)
export const outboxRepository = new OutboxRepository(getDatabase)
const subscriptions = new SubscriptionRepository(getDatabase)
export const preferences = new PreferencesRepository(getDatabase)

export const riskService = new RiskService(api, snapshots)
export const subscriptionService = new SubscriptionService(
  api,
  outboxRepository,
  subscriptions,
  new BackgroundSyncScheduler(),
)
export const outboxProcessor = new OutboxProcessor(api, outboxRepository, subscriptions)
export const adminService = new AdminService(api)
export const modelInfoService = new ModelInfoService(api)
