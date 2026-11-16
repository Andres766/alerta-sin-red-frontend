/// <reference lib="webworker" />
/**
 * Service Worker de AlertaSinRed.
 *
 * QUÉ SE CACHEA Y CUÁNDO
 * ┌───────────────────────────┬──────────────────────────┬───────────────────────────────┐
 * │ Recurso                   │ Estrategia               │ Por qué                       │
 * ├───────────────────────────┼──────────────────────────┼───────────────────────────────┤
 * │ App shell (HTML, JS, CSS, │ Precache en la           │ La app abre sin red desde el  │
 * │ íconos)                   │ instalación              │ primer arranque offline       │
 * │ Navegación (rutas SPA)    │ index.html precacheado   │ /zona/:id funciona offline    │
 * │ GET /api/v1/risk/snapshot │ Network-first (4 s) +    │ Siempre lo más fresco; si no  │
 * │                           │ copia en IndexedDB       │ hay red, lo último conocido   │
 * │ Historial de zona         │ Stale-while-revalidate   │ Útil pero no crítico          │
 * │ POST /subscriptions       │ Outbox + Background Sync │ Se envía al volver la señal   │
 * │ /admin/*, /auth/*         │ NUNCA se cachea          │ Datos privados y con token    │
 * └───────────────────────────┴──────────────────────────┴───────────────────────────────┘
 */
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { broadcast } from './application/broadcast'
import { OutboxProcessor } from './application/OutboxProcessor'
import { RiskNotifier } from './application/RiskNotifier'
import type { RiskSnapshot } from './domain/types'
import { ApiClient } from './infrastructure/http/ApiClient'
import { getDatabase } from './infrastructure/storage/database'
import { OutboxRepository } from './infrastructure/storage/OutboxRepository'
import { PreferencesRepository } from './infrastructure/storage/PreferencesRepository'
import { SnapshotRepository } from './infrastructure/storage/SnapshotRepository'
import { SubscriptionRepository } from './infrastructure/storage/SubscriptionRepository'

declare const self: ServiceWorkerGlobalScope

interface SyncEvent extends ExtendableEvent {
  readonly tag: string
}

const API_BASE = '/api/v1'
const api = new ApiClient(API_BASE)
const snapshots = new SnapshotRepository(getDatabase)
const notifier = new RiskNotifier(new PreferencesRepository(getDatabase), {
  async show(title, { body, url, tag }) {
    await self.registration.showNotification(title, {
      body, tag, data: { url }, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    })
  },
})
const outbox = new OutboxProcessor(
  api,
  new OutboxRepository(getDatabase),
  new SubscriptionRepository(getDatabase),
)

// ---- App shell ----------------------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }),
)

// ---- Datos de riesgo ------------------------------------------------------------
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname === `${API_BASE}/risk/snapshot`,
  new NetworkFirst({
    cacheName: 'api-snapshot',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 1 })],
  }),
)
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && /\/zones\/[0-9a-f-]{36}$/i.test(url.pathname),
  new NetworkFirst({
    cacheName: 'api-zone',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 })],
  }),
)
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname === `${API_BASE}/model`,
  new StaleWhileRevalidate({ cacheName: 'api-model', plugins: [new ExpirationPlugin({ maxEntries: 1 })] }),
)
registerRoute(
  ({ url, request }) => request.method === 'GET' && /\/zones\/[^/]+\/(history|days)$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-history',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 })],
  }),
)

// ---- Sincronización en segundo plano ---------------------------------------------
self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag !== 'outbox-sync') return
  syncEvent.waitUntil(
    outbox.flush().then((result) => {
      broadcast({ type: 'outbox-flushed', sent: result.sent, rejected: result.rejected.length })
      // Rechazar la promesa le indica al navegador que reintente más tarde.
      if (result.offline) throw new Error('Sin conexión; se reintentará')
    }),
  )
})

// Periodic Background Sync (Chrome, PWA instalada): refresca el riesgo aunque la app
// esté cerrada, para que al abrirla sin señal el dato guardado sea reciente.
self.addEventListener('periodicsync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag !== 'refresh-risk') return
  syncEvent.waitUntil(
    api.get<RiskSnapshot>('/risk/snapshot').then(async (snapshot) => {
      await snapshots.save(snapshot)
      broadcast({ type: 'snapshot-updated' })
      await notifier.check(snapshot) // aviso aunque la app esté cerrada
    }),
  )
})

// Tocar la notificación abre (o enfoca) la app en la zona correspondiente.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/'
  // Solo rutas internas: la notificación nunca debe abrir otro sitio.
  const target = url.startsWith('/') && !url.startsWith('//') ? url : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0]
      return open ? open.navigate(target).then((w) => w?.focus()) : self.clients.openWindow(target)
    }),
  )
})

// ---- Ciclo de vida ----------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
clientsClaim()
