import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CancelRequest, RiskSnapshot, SubscriptionRequest } from '../../domain/types'

/**
 * Esquema de IndexedDB. Se usa tanto desde la página como desde el Service
 * Worker (ambos contextos comparten la misma base de datos por origen).
 */

/** Acciones hechas sin conexión que esperan a ser enviadas (patrón Outbox). */
export type OutboxItem = {
  id?: number
  createdAt: string
  attempts: number
  lastError?: string
} & (
  | { kind: 'subscription'; payload: SubscriptionRequest }
  | { kind: 'cancel'; payload: CancelRequest }
)

export interface StoredSnapshot {
  key: 'latest'
  snapshot: RiskSnapshot
  savedAt: string
}

/** Suscripción hecha desde este dispositivo, con su código para darse de baja. */
export interface StoredSubscription {
  id: string
  zoneId: string
  phoneMasked: string
  cancelToken: string
  createdAt: string
  /** Baja solicitada sin conexión: se completará al sincronizar. */
  cancelPending?: boolean
}

/** Preferencia del dispositivo (clave-valor), p. ej. la zona favorita. */
export interface StoredPreference {
  key: string
  value: string
}

interface AlertaSinRedDB extends DBSchema {
  snapshot: { key: 'latest'; value: StoredSnapshot }
  outbox: { key: number; value: OutboxItem; indexes: { byCreatedAt: string } }
  subscriptions: { key: string; value: StoredSubscription }
  preferences: { key: string; value: StoredPreference }
}

export const DB_NAME = 'alerta-sin-red'
const DB_VERSION = 3

export type AppDatabase = IDBPDatabase<AlertaSinRedDB>

let dbPromise: Promise<AppDatabase> | null = null

export function getDatabase(): Promise<AppDatabase> {
  dbPromise ??= openDB<AlertaSinRedDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Migraciones incrementales: cada versión solo agrega lo suyo, así un
      // dispositivo con la versión 1 conserva su snapshot y su bandeja de salida.
      if (oldVersion < 1) {
        db.createObjectStore('snapshot', { keyPath: 'key' })
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        outbox.createIndex('byCreatedAt', 'createdAt')
      }
      if (oldVersion < 2) {
        db.createObjectStore('subscriptions', { keyPath: 'id' })
      }
      if (oldVersion < 3) {
        db.createObjectStore('preferences', { keyPath: 'key' })
      }
    },
  })
  return dbPromise
}
