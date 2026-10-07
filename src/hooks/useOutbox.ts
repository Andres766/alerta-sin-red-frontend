import { useCallback, useEffect, useState } from 'react'
import { listen } from '../application/broadcast'
import type { OutboxItem } from '../infrastructure/storage/database'
import { outboxProcessor, outboxRepository } from '../services'
import { useOnlineStatus } from './useOnlineStatus'

export function useOutbox() {
  const [pending, setPending] = useState<OutboxItem[]>([])
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const online = useOnlineStatus()

  const reload = useCallback(async () => setPending(await outboxRepository.pending()), [])

  const flush = useCallback(async () => {
    const result = await outboxProcessor.flush()
    if (result.sent) setLastMessage(`${result.sent} suscripción(es) pendiente(s) enviada(s).`)
    if (result.rejected.length) setLastMessage(`Rechazadas: ${result.rejected.join('; ')}`)
    await reload()
  }, [reload])

  useEffect(() => {
    void reload()
  }, [reload])

  // Respaldo para navegadores sin Background Sync: al volver la red, se vacía aquí.
  useEffect(() => {
    if (online) void flush()
  }, [online, flush])

  useEffect(
    () =>
      listen((message) => {
        if (message.type === 'outbox-flushed') void reload()
      }),
    [reload],
  )

  return { pending, reload, flush, lastMessage }
}
