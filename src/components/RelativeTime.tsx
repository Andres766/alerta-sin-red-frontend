import { formatDateTime, timeAgo } from '../domain/time'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'

/**
 * "hace 5 minutos" que se actualiza solo. Usa <time> (fecha legible por
 * máquinas) y muestra la fecha exacta al pasar el cursor.
 */
export function RelativeTime({ iso, withoutPrefix = false }: { iso: string; withoutPrefix?: boolean }) {
  const now = useNow()
  const { locale } = useI18n()
  const text = timeAgo(iso, now, locale)
  return (
    <time dateTime={iso} title={formatDateTime(iso, locale)}>
      {withoutPrefix ? text.replace(/^hace /, '').replace(/ ago$/, '') : text}
    </time>
  )
}
