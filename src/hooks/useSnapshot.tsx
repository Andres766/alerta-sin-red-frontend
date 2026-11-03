import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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

/** Esperas entre reintentos: cubren el ~1 min que tarda en despertar el plan gratuito. */
const RETRY_DELAYS_MS = [4_000, 8_000, 15_000, 30_000, 60_000]

/**
 * Muestra primero lo guardado en el dispositivo (respuesta instantánea, incluso
 * sin red) y en paralelo pide al servidor la versión fresca.
 */
export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SnapshotResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const online = useOnlineStatus()
  const attempt = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Función con nombre: el reintento programado se llama a sí misma sin leer
  // la constante `refresh` mientras todavía se está inicializando.
  const refresh = useCallback(async function refreshSnapshot(): Promise<void> {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    setLoading(true)
    let fresh = false
    try {
      const result = await riskService.refresh()
      setData(result)
      setError(null)
      fresh = result.source === 'network'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
    // Con red pero sin respuesta del servidor (p. ej. Render despertando tras estar
    // inactivo), se reintenta solo con esperas crecientes hasta obtener datos frescos.
    if (fresh) {
      attempt.current = 0
    } else if (navigator.onLine && attempt.current < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[attempt.current++]
      retryTimer.current = setTimeout(() => void refreshSnapshot(), delay)
    }
  }, [])

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current)
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
