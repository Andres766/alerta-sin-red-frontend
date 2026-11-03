import { RelativeTime } from './RelativeTime'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSnapshot } from '../hooks/useSnapshot'

/** Deja siempre claro si se ve información en vivo o guardada, y de cuándo es. */
export function ConnectionBanner() {
  const online = useOnlineStatus()
  const { data } = useSnapshot()
  const fromCache = data?.source === 'cache'

  if (online && !fromCache) return null
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-slate-800 px-4 py-2 text-sm text-slate-100"
    >
      <span className="size-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
      {online ? 'El servidor no responde.' : 'Sin conexión.'}{' '}
      {data ? (
        <span>
          Mostrando los últimos datos guardados (actualizados <RelativeTime iso={data.savedAt} />).
        </span>
      ) : (
        'Aún no hay datos guardados en este dispositivo.'
      )}
    </div>
  )
}
