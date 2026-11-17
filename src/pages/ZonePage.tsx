import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DailyRiskStrip } from '../components/DailyRiskStrip'
import { HazardIcon } from '../components/HazardIcon'
import { IconAlert, IconBell, IconSparkles, IconStar } from '../components/icons'
import { RelativeTime } from '../components/RelativeTime'
import { RiskBadge } from '../components/RiskBadge'
import { ShareButton } from '../components/ShareButton'
import { FEATURE_UNIT, LEVEL_ORDER, RISK_LEVELS } from '../domain/riskLevel'
import { formatDateTime } from '../domain/time'
import type { Assessment, DayRisk, ZoneRisk } from '../domain/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFavoriteZone } from '../hooks/useFavoriteZone'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSnapshot } from '../hooks/useSnapshot'
import { alertLabel, featureLabel, hazardLabel, keyFactors, levelLabel, recommendations } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'
import { riskService } from '../services'

const RiskMap = lazy(() => import('../components/RiskMap'))

/** Panel con título; todas las secciones de la página comparten este marco. */
function Panel({ title, icon, area, children }: { title: string; icon?: ReactNode; area: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5" style={{ gridArea: area }}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Celda de la franja de datos principales. */
function Stat({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 p-4 sm:p-5 ${className}`}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

export function ZonePage() {
  const translator = useI18n()
  const { t, locale, number } = translator
  const { zoneId } = useParams()
  const { data } = useSnapshot()
  const online = useOnlineStatus()
  const { favoriteId, setFavorite } = useFavoriteZone()
  const fromSnapshot = data?.snapshot.items.find((i) => i.zone.id === zoneId)
  // Enlace directo a una zona que este dispositivo aún no tiene guardada.
  const [fetched, setFetched] = useState<{ id: string; item: ZoneRisk | null; error?: string } | null>(null)
  const [history, setHistory] = useState<Assessment[]>([])
  const [days, setDays] = useState<DayRisk[]>([])
  const item = fromSnapshot ?? (fetched && fetched.id === zoneId ? fetched.item : undefined)
  useDocumentTitle(item ? item.zone.name : t('zone.docTitle'))

  useEffect(() => {
    if (!zoneId || fromSnapshot) return
    let active = true
    riskService
      .zone(zoneId)
      .then((found) => active && setFetched({ id: zoneId, item: found }))
      .catch((e: unknown) =>
        active && setFetched({ id: zoneId, item: null, error: e instanceof Error ? e.message : 'Error' }),
      )
    return () => {
      active = false
    }
  }, [zoneId, fromSnapshot])

  useEffect(() => {
    if (!zoneId) return
    let active = true
    // Pasa por el Service Worker (stale-while-revalidate): también funciona offline.
    void riskService.history(zoneId).then((list) => active && setHistory(list))
    void riskService.daily(zoneId).then((list) => active && setDays(list))
    return () => {
      active = false
    }
  }, [zoneId])

  if (item === undefined) {
    if (fetched && fetched.id === zoneId && fetched.error) {
      return <p className="rounded-lg border border-warning-line bg-warning-bg p-5 text-warning-ink">{fetched.error}</p>
    }
    return <div className="h-64 animate-pulse rounded-lg border border-line bg-surface" aria-label={t('zone.loading')} />
  }
  if (item === null) {
    return (
      <p className="rounded-lg border border-line bg-surface p-5 text-muted">
        {t('zone.notFound')} <Link to="/" className="font-semibold text-fg underline">{t('zone.backHome')}</Link>
      </p>
    )
  }
  const { zone, assessment } = item
  const info = assessment ? RISK_LEVELS[assessment.level] : null
  const isFavorite = favoriteId === zone.id
  const factors = assessment ? keyFactors(translator, assessment.features) : []

  return (
    <article className="space-y-6">
      <Link to="/" className="inline-block text-sm text-muted hover:text-fg">
        ← {t('zone.allZones')}
      </Link>

      {/* Título y acciones */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <HazardIcon hazard={zone.hazard_type} className="size-4" />
            {hazardLabel(translator, zone.hazard_type)} · {zone.municipality}, {zone.department}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{zone.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void setFavorite(isFavorite ? null : zone.id)}
            aria-pressed={isFavorite}
            className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-medium transition ${isFavorite ? 'border-warning-line bg-warning-bg text-warning-ink' : 'border-control bg-surface text-fg hover:bg-raised'}`}
          >
            <IconStar filled={isFavorite} className="size-4" />
            {isFavorite ? t('zone.isMine') : t('zone.setMine')}
          </button>
          <ShareButton item={item} compact />
          <Link
            to={`/suscribirme?zona=${zone.id}`}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-on-primary transition hover:opacity-90"
          >
            <IconBell className="size-4" /> {t('zone.subscribe')}
          </Link>
        </div>
      </header>

      {/* Franja con el nivel, la confianza y la fecha de la evaluación */}
      {assessment && info ? (
        <dl className="relative grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${info.stripe}`} />
          <Stat label={alertLabel(translator, assessment.level)} className="col-span-2 border-b border-line lg:col-span-1 lg:border-b-0">
            <span className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: info.color }} aria-hidden />
              <RiskLevelText level={levelLabel(translator, assessment.level)} template={t('risk.badge')} locale={locale} />
            </span>
          </Stat>
          <Stat label={t('zone.confidenceLabel')} className="border-line lg:border-l">
            <span className="num text-2xl font-semibold">{Math.round(assessment.probability * 100)}%</span>
          </Stat>
          <Stat label={t('zone.assessed')} className="border-l border-line">
            <span className="block font-medium"><RelativeTime iso={assessment.assessed_at} /></span>
            <span className="block text-xs text-muted">{formatDateTime(assessment.assessed_at, locale)}</span>
          </Stat>
          <Stat label={t('zone.model')} className="col-span-2 border-t border-line lg:col-span-1 lg:border-l lg:border-t-0">
            <span className="block truncate font-mono text-sm" title={assessment.model_version}>{assessment.model_version}</span>
            <span className="block text-xs text-muted">{t('zone.weatherSource', { source: assessment.weather_source })}</span>
          </Stat>
        </dl>
      ) : (
        <p className="rounded-lg border border-line bg-surface p-5 text-muted">{t('zone.notAssessed')}</p>
      )}

      {/* Dos columnas: la explicación a la izquierda; qué hacer e historial a la derecha.
          En celular, "Qué hacer" va primero. */}
      <div className="grid gap-6 [grid-template-areas:'todo'_'map'_'why'_'history'] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_auto_1fr] lg:[grid-template-areas:'map_map'_'why_todo'_'why_history']">
        {/* Mapa real centrado en la zona: el relieve y los ríos explican el riesgo. Sin red se omite. */}
        {online && (
          <section style={{ gridArea: 'map' }} aria-label={t('zone.mapTitle')}>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border border-line bg-surface" aria-hidden />}>
              <RiskMap items={data?.snapshot.items ?? [item]} focusId={zone.id} className="h-64 lg:h-72" />
            </Suspense>
          </section>
        )}
        {assessment && info && (
          <Panel area="todo" title={t('zone.todo')} icon={<IconAlert className="size-4.5 text-muted" />}>
            <ol className="space-y-3">
              {recommendations(translator, assessment.level).map((r, i) => (
                <li key={r} className="flex gap-3">
                  <span className={`num grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${info.badge}`}>
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {assessment && (
          <Panel area="why" title={t('zone.why')} icon={<IconSparkles className="size-4.5 text-muted" />}>
            {factors.length ? (
              <ul className="divide-y divide-rule rounded-md border border-line">
                {factors.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: info?.color }} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('zone.noFactors')}</p>
            )}

            <h3 className="mt-6 text-sm font-semibold">{t('zone.probabilities')}</h3>
            <div className="mt-2.5 space-y-2.5">
              {LEVEL_ORDER.map((lvl) => {
                const p = assessment.probabilities[lvl] ?? 0
                return (
                  <div key={lvl} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-muted">{levelLabel(translator, lvl)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-active">
                      <div className={`h-full rounded-full ${RISK_LEVELS[lvl].stripe}`} style={{ width: `${p * 100}%` }} />
                    </div>
                    <span className="num w-11 text-right font-medium">{Math.round(p * 100)}%</span>
                  </div>
                )
              })}
            </div>

            <h3 className="mt-6 text-sm font-semibold">{t('zone.inputs')}</h3>
            <dl className="mt-2.5 grid grid-cols-2 overflow-hidden rounded-md border border-line sm:grid-cols-4">
              {Object.entries(assessment.features).map(([key, value], i) => (
                <div key={key} className={`border-line p-3 ${featureCellBorders(i)}`}>
                  <dt className="text-xs text-muted">{featureLabel(translator, key)}</dt>
                  <dd className="num mt-0.5 font-semibold">
                    {number(Number(value), 2)} <span className="text-xs font-normal text-muted">{FEATURE_UNIT[key]}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        )}

        <Panel area="history" title={t('zone.history')}>
          {days.length > 0 && <DailyRiskStrip days={days} />}
          {history.length > 0 && (
            <>
              <h3 className={`text-sm font-medium ${days.length > 0 ? 'mt-6' : ''}`}>{t('zone.latest')}</h3>
              <ol className="mt-1 divide-y divide-rule text-sm">
                {history.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-muted">
                      <span className="whitespace-nowrap">{formatDateTime(h.assessed_at, locale)}</span>
                      {h.weather_source.endsWith('historico') && (
                        <span className="ml-1.5 rounded bg-active px-1.5 py-0.5 text-[11px]">{t('zone.historical')}</span>
                      )}
                    </span>
                    <RiskBadge level={h.level} />
                  </li>
                ))}
              </ol>
            </>
          )}
          {days.length === 0 && history.length === 0 && (
            <p className="text-sm text-muted">{t('zone.historyEmpty')}</p>
          )}
        </Panel>
      </div>
    </article>
  )
}

/** "Riesgo muy alto" / "Very high risk" con mayúscula inicial. */
function RiskLevelText({ level, template, locale }: { level: string; template: string; locale: string }) {
  const text = template.replace('{level}', level.toLocaleLowerCase(locale))
  return <>{text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)}</>
}

/** Bordes de la tabla de variables: 2 columnas en celular, 4 desde 640 px. */
function featureCellBorders(i: number): string {
  return [
    i % 2 === 1 ? 'border-l' : '',
    i % 4 === 0 ? 'sm:border-l-0' : 'sm:border-l',
    i >= 2 ? 'border-t' : '',
    i >= 4 ? 'sm:border-t' : 'sm:border-t-0',
  ].join(' ')
}
