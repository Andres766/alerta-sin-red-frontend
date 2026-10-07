/** Canal entre el Service Worker y las pestañas abiertas de la app. */
export const CHANNEL_NAME = 'alerta-sin-red'

export type AppMessage =
  | { type: 'snapshot-updated' }
  | { type: 'outbox-flushed'; sent: number; rejected: number }

export function broadcast(message: AppMessage): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage(message)
  channel.close()
}

export function listen(handler: (message: AppMessage) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<AppMessage>) => handler(event.data)
  return () => channel.close()
}
