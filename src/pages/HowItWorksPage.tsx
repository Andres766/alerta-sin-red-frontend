import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconBell, IconSparkles, IconWifiOff } from '../components/icons'
import { formatDateTime } from '../domain/time'
import type { ModelCard } from '../domain/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { featureLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'
import { modelInfoService } from '../services'

const percent = (value: number | undefined) => (value === undefined ? '—' : `${Math.round(value * 100)}%`)

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 p-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-raised text-muted">{icon}</span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">
          <span className="num text-muted">{n}.</span> {title}
        </h2>
        <div className="mt-1.5 space-y-2 text-[15px] text-fg">{children}</div>
      </div>
    </li>
  )
}

export function HowItWorksPage() {
  const translator = useI18n()
  const { t, locale } = translator
  useDocumentTitle(t('how.docTitle'))
  const [card, setCard] = useState<ModelCard | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    modelInfoService
      .card()
      .then(setCard)
      .catch(() => setError(true))
  }, [])

  const importances = card ? Object.entries(card.feature_importances).sort(([, a], [, b]) => b - a) : []
  const maxImportance = importances[0]?.[1] ?? 1

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{t('how.title')}</h1>
        <p className="mt-1.5 text-muted">{t('how.lead')}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ol className="divide-y divide-rule rounded-lg border border-line bg-surface">
          <Step n={1} icon={<IconSparkles className="size-4.5" />} title={t('how.step1Title')}>
            <p>{t('how.step1a')}</p>
            <p>{t('how.step1b')}</p>
          </Step>
          <Step n={2} icon={<IconWifiOff className="size-4.5" />} title={t('how.step2Title')}>
            <p>{t('how.step2a')}</p>
            <p>{t('how.step2b')}</p>
          </Step>
          <Step n={3} icon={<IconBell className="size-4.5" />} title={t('how.step3Title')}>
            <p>{t('how.step3a')}</p>
            <Link to="/suscribirme" className="inline-block font-medium underline underline-offset-2">
              {t('how.subscribe')}
            </Link>
          </Step>
        </ol>

        <section aria-labelledby="ficha" className="rounded-lg border border-line bg-surface">
          <h2 id="ficha" className="border-b border-line px-5 py-3.5 text-base font-semibold">{t('how.card')}</h2>
          {error && <p className="p-5 text-sm text-muted">{t('how.cardError')}</p>}
          {!card && !error && <div className="m-5 h-40 animate-pulse rounded-md bg-active" aria-hidden />}
          {card && (
            <>
              <dl className="grid grid-cols-2 border-b border-line">
                {(
                  [
                    [t('how.accuracy'), card.metrics.test_accuracy, 'border-b border-r'],
                    [t('how.f1'), card.metrics.test_f1_macro, 'border-b'],
                    [t('how.recallHigh'), card.metrics.recall_alto, 'border-r'],
                    [t('how.recallVeryHigh'), card.metrics.recall_muy_alto, ''],
                  ] as const
                ).map(([label, value, borders]) => (
                  <div key={label} className={`border-line px-5 py-4 ${borders}`}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="num mt-0.5 text-2xl font-semibold">{percent(value)}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-6 p-5">
                <p className="text-xs text-muted">
                  {t('how.cardMeta', {
                    algorithm: card.algorithm,
                    version: card.version,
                    date: formatDateTime(card.trained_at, locale),
                    samples: translator.number(card.n_samples, 0),
                    source: card.data_source,
                  })}
                </p>

                <div>
                  <h3 className="text-sm font-semibold">{t('how.importances')}</h3>
                  <ul className="mt-2.5 space-y-2">
                    {importances.map(([name, value]) => (
                      <li key={name} className="grid grid-cols-[minmax(0,10rem)_1fr_2.75rem] items-center gap-3 text-sm">
                        <span className="truncate text-muted">{featureLabel(translator, name)}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-active">
                          <span className="block h-full rounded-full bg-fg" style={{ width: `${(value / maxImportance) * 100}%` }} />
                        </span>
                        <span className="num text-right">{percent(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">{t('how.limitations')}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {card.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="max-w-2xl text-sm text-muted">{t('how.disclaimer')}</p>
    </div>
  )
}
