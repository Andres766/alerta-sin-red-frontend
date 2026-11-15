import { RelativeTime } from './RelativeTime'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSnapshot } from '../hooks/useSnapshot'
import { useI18n } from '../i18n/I18nProvider'

/** Deja siempre claro si se ve información en vivo o guardada, y de cuándo es. */
export function ConnectionBanner() {
  const online = useOnlineStatus()
  const { data } = useSnapshot()
  const { t } = useI18n()
  const fromCache = data?.source === 'cache'

  if (online && !fromCache) return null
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning-line bg-warning-bg px-4 py-2 text-sm text-warning-ink"
    >
      <span className="size-2 shrink-0 rounded-full bg-risk-moderate" aria-hidden />
      <span>
        <strong className="font-semibold">{online ? t('conn.serverDown') : t('conn.offline')}</strong>{' '}
        {data ? <SavedAt iso={data.savedAt} /> : t('conn.noData')}
      </span>
    </div>
  )
}

/** "Mostrando los últimos datos guardados (actualizados hace 5 minutos)." con la hora viva. */
function SavedAt({ iso }: { iso: string }) {
  const { t } = useI18n()
  const [before, after = ''] = t('conn.showingSaved', { ago: '|' }).split('|')
  return (
    <>
      {before}
      <RelativeTime iso={iso} />
      {after}
    </>
  )
}
