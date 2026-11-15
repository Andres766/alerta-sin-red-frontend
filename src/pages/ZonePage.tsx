import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HazardIcon } from '../components/HazardIcon'
import { IconAlert, IconBell, IconSparkles, IconStar } from '../components/icons'
import { RelativeTime } from '../components/RelativeTime'
import { RiskBadge } from '../components/RiskBadge'
import { ShareButton } from '../components/ShareButton'
import { FEATURE_UNIT, LEVEL_ORDER, RISK_LEVELS } from '../domain/riskLevel'
import { formatDateTime } from '../domain/time'
import type { Assessment, ZoneRisk } from '../domain/types'
import { useFavoriteZone } from '../hooks/useFavoriteZone'
import { useSnapshot } from '../hooks/useSnapshot'
import { riskService } from '../services'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { alertLabel, featureLabel, hazardLabel, keyFactors, levelLabel, recommendations } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

export function ZonePage() {
  const translator = useI18n()
  const { zoneId } = useParams()
  const { data } = useSnapshot()
  const { favoriteId, setFavorite } = useFavoriteZone()
  const fromSnapshot = data?.snapshot.items.find((i) => i.zone.id === zoneId)
  // Enlace directo a una zona que este dispositivo aún no tiene guardada.
  const [fetched, setFetched] = useState<{ id: string; item: ZoneRisk | null; error?: string } | null>(null)
  const [history, setHistory] = useState<Assessment[]>([])
  const item = fromSnapshot ?? (fetched && fetched.id === zoneId ? fetched.item : undefined)
  useDocumentTitle(item ? item.zone.name : 'Zona')

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
    return () => {
      active = false
    }
  }, [zoneId])

  if (item === undefined) {
    if (fetched && fetched.id === zoneId && fetched.error) {
      return <p className="rounded-lg bg-warning-bg p-5 text-warning-ink">{fetched.error}</p>
    }
    return <div className="h-64 animate-pulse rounded-lg bg-active" aria-label="Cargando zona" />
  }
  if (item === null) {
    return (
      <p className="rounded-lg bg-surface p-5 text-muted">
        Zona no encontrada. <Link to="/" className="font-semibold underline">Volver al inicio</Link>
      </p>
    )
  }
  const { zone, assessment } = item
  const info = assessment ? RISK_LEVELS[assessment.level] : null

  return (
    <article className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="text-sm font-medium text-muted hover:underline">
          ← Todas las zonas
        </Link>
        <button
          onClick={() => void setFavorite(favoriteId === zone.id ? null : zone.id)}
          aria-pressed={favoriteId === zone.id}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition ${favoriteId === zone.id ? 'border-warning-line bg-warning-bg text-warning-ink' : 'border-control bg-surface text-fg hover:bg-raised'}`}
        >
          <IconStar filled={favoriteId === zone.id} className="size-4" />
          {favoriteId === zone.id ? 'Es mi zona' : 'Fijar como mi zona'}
        </button>
      </div>

      <header
        className={`rounded-lg bg-linear-to-br p-5 text-white ${info?.hero ?? 'from-slate-600 to-slate-800'}`}
      >
        <p className="flex items-center gap-2 text-sm text-white/85">
          <HazardIcon hazard={zone.hazard_type} className="size-4" />
          {hazardLabel(translator, zone.hazard_type)} · {zone.municipality}, {zone.department}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{zone.name}</h1>
        {assessment && info ? (
          <>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/80">{alertLabel(translator, assessment.level)}</p>
                <p className="text-3xl font-extrabold">Riesgo {levelLabel(translator, assessment.level).toLowerCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold tabular-nums">{Math.round(assessment.probability * 100)}%</p>
                <p className="text-xs text-white/80">confianza del modelo</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/75">
              Evaluado <RelativeTime iso={assessment.assessed_at} /> ({formatDateTime(assessment.assessed_at)}) ·
              modelo {assessment.model_version}
            </p>
          </>
        ) : (
          <p className="mt-3 text-white/85">Esta zona aún no ha sido evaluada.</p>
        )}
      </header>

      {assessment && info && (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <IconAlert className="size-5 text-muted" /> ¿Qué hacer?
          </h2>
          <ol className="mt-3 space-y-2">
            {recommendations(translator, assessment.level).map((r, i) => (
              <li key={r} className="flex gap-3">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${info.badge}`}>
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {assessment && (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <IconSparkles className="size-5 text-muted" /> ¿Por qué este nivel?
          </h2>
          {keyFactors(translator, assessment.features).length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {keyFactors(translator, assessment.features).map((f) => (
                <li key={f} className="rounded-full bg-raised px-3 py-1.5 text-sm text-fg">{f}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">No hay factores de riesgo destacados.</p>
          )}

          <h3 className="mt-5 text-sm font-semibold text-fg">Probabilidad por nivel (modelo de IA)</h3>
          <div className="mt-2 space-y-2">
            {LEVEL_ORDER.map((lvl) => {
              const p = assessment.probabilities[lvl] ?? 0
              return (
                <div key={lvl} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-muted">{levelLabel(translator, lvl)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-raised">
                    <div className={`h-full rounded-full ${RISK_LEVELS[lvl].stripe}`} style={{ width: `${p * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-semibold tabular-nums">{Math.round(p * 100)}%</span>
                </div>
              )
            })}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-fg">Variables de entrada</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(assessment.features).map(([key, value]) => (
              <div key={key} className="rounded-md bg-raised p-3">
                <dt className="text-xs text-muted">{featureLabel(translator, key)}</dt>
                <dd className="mt-0.5 font-bold tabular-nums">
                  {Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-muted">{FEATURE_UNIT[key]}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Fuente del clima: {assessment.weather_source}</p>
        </section>
      )}

      {history.length > 1 && (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-bold">Evolución reciente</h2>
          <div className="mt-3 flex h-16 items-end gap-1" aria-hidden>
            {[...history].reverse().map((h) => (
              <div
                key={h.id}
                title={`${formatDateTime(h.assessed_at)}: ${levelLabel(translator, h.level)}`}
                className={`flex-1 rounded-t ${RISK_LEVELS[h.level].stripe}`}
                style={{ height: `${25 + RISK_LEVELS[h.level].severity * 25}%` }}
              />
            ))}
          </div>
          <ol className="mt-4 divide-y divide-rule text-sm">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-muted">{formatDateTime(h.assessed_at)}</span>
                <RiskBadge level={h.level} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link
        to={`/suscribirme?zona=${zone.id}`}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-semibold text-on-primary transition hover:opacity-90"
      >
        <IconBell className="size-5" /> Recibir alertas por SMS de esta zona
      </Link>
      <ShareButton item={item} />
    </article>
  )
}
