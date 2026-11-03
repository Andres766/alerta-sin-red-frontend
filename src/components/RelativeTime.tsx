import { formatDateTime, timeAgo } from '../domain/time'
import { useNow } from '../hooks/useNow'

/**
 * "hace 5 minutos" que se actualiza solo. Usa <time> (fecha legible por
 * máquinas) y muestra la fecha exacta al pasar el cursor.
 */
export function RelativeTime({ iso, withoutPrefix = false }: { iso: string; withoutPrefix?: boolean }) {
  const now = useNow()
  const text = timeAgo(iso, now)
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {withoutPrefix ? text.replace(/^hace /, '') : text}
    </time>
  )
}
