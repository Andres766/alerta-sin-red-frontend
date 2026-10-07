import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RiskBadge } from '../components/RiskBadge'
import { FEATURE_LABEL, HAZARD_LABEL, RISK_LEVELS } from '../domain/riskLevel'
import { formatDateTime, timeAgo } from '../domain/time'
import type { Assessment, RiskLevel } from '../domain/types'
import { useSnapshot } from '../hooks/useSnapshot'
import { API_BASE } from '../services'

const LEVEL_ORDER: RiskLevel[] = ['BAJO', 'MODERADO', 'ALTO', 'MUY_ALTO']

export function ZonePage() {
  const { zoneId } = useParams()
  const { data } = useSnapshot()
  const item = data?.snapshot.items.find((i) => i.zone.id === zoneId)
  const [history, setHistory] = useState<Assessment[] | null>(null)

  useEffect(() => {
    if (!zoneId || !/^[0-9a-f-]{36}$/i.test(zoneId)) return
    // Pasa por el Service Worker (stale-while-revalidate): también funciona offline.
    fetch(`${API_BASE}/zones/${zoneId}/history?limit=12`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setHistory)
      .catch(() => setHistory(null))
  }, [zoneId])

  if (!item) {
    return (
      <p className="text-slate-600">
        Zona no encontrada. <Link to="/" className="underline">Volver</Link>
      </p>
    )
  }
  const { zone, assessment } = item
  const info = assessment ? RISK_LEVELS[assessment.level] : null

  return (
    <article className="space-y-6">
      <Link to="/" className="text-sm text-slate-600 hover:underline">← Todas las zonas</Link>
      <header>
        <p className="text-sm text-slate-500">
          {HAZARD_LABEL[zone.hazard_type]} · {zone.municipality}, {zone.department}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{zone.name}</h1>
      </header>

      <section className={`rounded-2xl border p-5 ${info?.surface ?? 'border-slate-200 bg-white'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge level={assessment?.level ?? null} large />
          {info && <span className="font-semibold">{info.alert}</span>}
        </div>
        {assessment ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Evaluado {timeAgo(assessment.assessed_at)} ({formatDateTime(assessment.assessed_at)})
              · modelo {assessment.model_version} · clima {assessment.weather_source}
            </p>
            <h2 className="mt-5 font-semibold">¿Qué hacer?</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {info?.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-slate-600">Esta zona aún no ha sido evaluada.</p>
        )}
      </section>

      {assessment && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">¿Por qué este nivel?</h2>
            {assessment.key_factors.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {assessment.key_factors.map((f) => <li key={f}>{f}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-slate-600">No hay factores de riesgo destacados.</p>
            )}

            <h3 className="mt-5 text-sm font-semibold text-slate-700">Probabilidad por nivel (modelo de IA)</h3>
            <div className="mt-2 space-y-1.5">
              {LEVEL_ORDER.map((lvl) => {
                const p = assessment.probabilities[lvl] ?? 0
                return (
                  <div key={lvl} className="flex items-center gap-2 text-sm">
                    <span className="w-20 shrink-0 text-slate-600">{RISK_LEVELS[lvl].label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${RISK_LEVELS[lvl].badge}`} style={{ width: `${p * 100}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums">{Math.round(p * 100)}%</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Variables de entrada</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              {Object.entries(assessment.features).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-slate-500">{FEATURE_LABEL[key]?.label ?? key}</dt>
                  <dd className="font-semibold tabular-nums">
                    {Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}{' '}
                    {FEATURE_LABEL[key]?.unit}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      {history && history.length > 1 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Evaluaciones recientes</h2>
          <ol className="mt-3 divide-y divide-slate-100 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-slate-600">{formatDateTime(h.assessed_at)}</span>
                <RiskBadge level={h.level} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link
        to={`/suscribirme?zona=${zone.id}`}
        className="block rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white"
      >
        Recibir alertas por SMS de esta zona
      </Link>
    </article>
  )
}
