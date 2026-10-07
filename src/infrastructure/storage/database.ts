import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { RiskSnapshot, SubscriptionRequest } from '../../domain/types'

/**
 * Esquema de IndexedDB. Se usa tanto desde la página como desde el Service
 * Worker (ambos contextos comparten la misma base de datos por origen).
 */

export interface OutboxItem {
  id?: number
  kind: 'subscription'
  payload: SubscriptionRequest
  createdAt: string
  attempts: number
  lastError?: string
}

export interface StoredSnapshot {
  key: 'latest'
  snapshot: RiskSnapshot
  savedAt: string
}

interface AlertaSinRedDB extends DBSchema {
  snapshot: { key: 'latest'; value: StoredSnapshot }
  outbox: { key: number; value: OutboxItem; indexes: { byCreatedAt: string } }
}

export const DB_NAME = 'alerta-sin-red'
const DB_VERSION = 1

export type AppDatabase = IDBPDatabase<AlertaSinRedDB>

let dbPromise: Promise<AppDatabase> | null = null

export function getDatabase(): Promise<AppDatabase> {
  dbPromise ??= openDB<AlertaSinRedDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Migraciones incrementales: cada versión solo agrega lo suyo.
      if (oldVersion < 1) {
        db.createObjectStore('snapshot', { keyPath: 'key' })
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        outbox.createIndex('byCreatedAt', 'createdAt')
      }
    },
  })
  return dbPromise
}
