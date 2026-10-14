import { useCallback, useEffect, useState } from 'react'
import { listen } from '../application/broadcast'
import type { OutboxItem, StoredSubscription } from '../infrastructure/storage/database'
import { outboxProcessor, outboxRepository, subscriptionService } from '../services'
import { useOnlineStatus } from './useOnlineStatus'

/** Bandeja de salida y suscripciones de este dispositivo, siempre sincronizadas. */
export function useOutbox() {
  const [pending, setPending] = useState<OutboxItem[]>([])
  const [mine, setMine] = useState<StoredSubscription[]>([])
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const online = useOnlineStatus()

  const reload = useCallback(async () => {
    const [items, subs] = await Promise.all([outboxRepository.pending(), subscriptionService.mine()])
    setPending(items)
    setMine(subs)
  }, [])

  const flush = useCallback(async () => {
    const result = await outboxProcessor.flush()
    if (result.sent) setLastMessage(`${result.sent} acción(es) pendiente(s) enviada(s).`)
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

  return { pending, mine, reload, flush, lastMessage }
}
