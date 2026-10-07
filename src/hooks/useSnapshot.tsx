import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { listen } from '../application/broadcast'
import type { SnapshotResult } from '../application/RiskService'
import { riskService } from '../services'
import { useOnlineStatus } from './useOnlineStatus'

interface SnapshotState {
  data: SnapshotResult | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SnapshotContext = createContext<SnapshotState | null>(null)

/**
 * Muestra primero lo guardado en el dispositivo (respuesta instantánea, incluso
 * sin red) y en paralelo pide al servidor la versión fresca.
 */
export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SnapshotResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const online = useOnlineStatus()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setData(await riskService.refresh())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void riskService.getCached().then((cached) => cached && setData((d) => d ?? cached))
    void refresh()
  }, [refresh])

  // Al recuperar la conexión se sincroniza de inmediato.
  useEffect(() => {
    if (online) void refresh()
  }, [online, refresh])

  // El Service Worker avisa si actualizó los datos en segundo plano.
  useEffect(
    () =>
      listen((message) => {
        if (message.type === 'snapshot-updated') {
          void riskService.getCached().then((cached) => cached && setData(cached))
        }
      }),
    [],
  )

  return (
    <SnapshotContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </SnapshotContext.Provider>
  )
}

export function useSnapshot(): SnapshotState {
  const context = useContext(SnapshotContext)
  if (!context) throw new Error('useSnapshot debe usarse dentro de <SnapshotProvider>')
  return context
}
