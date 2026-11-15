import { Link } from 'react-router-dom'
import { IconMapPin } from '../components/icons'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'

export function NotFoundPage() {
  const { t } = useI18n()
  useDocumentTitle(t('notFound.title'))
  return (
    <section className="rounded-lg border border-line bg-surface p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-raised text-fg">
        <IconMapPin className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-muted">{t('notFound.code')}</p>
      <h1 className="text-2xl font-semibold">{t('notFound.heading')}</h1>
      <p className="mt-1 text-muted">{t('notFound.body')}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/" className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary">
          {t('notFound.zones')}
        </Link>
        <Link to="/suscribirme" className="rounded-lg border border-control px-4 py-2.5 font-semibold">
          {t('nav.alerts')}
        </Link>
      </div>
    </section>
  )
}
