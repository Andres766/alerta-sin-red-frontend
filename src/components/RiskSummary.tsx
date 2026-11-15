import { Link } from 'react-router-dom'
import { countByLevel, LEVEL_ORDER, mostSevere, RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { IconAlert, IconChevronRight, IconShield } from './icons'
import { RelativeTime } from './RelativeTime'
import { alertLabel, levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

/** Lo primero que ve la persona: ¿hay alguna alerta activa en la región? */
export function RiskSummary({ items }: { items: ZoneRisk[] }) {
  const translator = useI18n()
  const worst = mostSevere(items)
  const counts = countByLevel(items)

  if (!worst?.assessment) {
    return (
      <section className="rounded-lg bg-linear-to-br from-slate-700 to-slate-900 p-5 text-white">
        <p className="text-sm font-medium text-slate-300">Estado de la región</p>
        <p className="mt-1 text-xl font-bold">Aún no hay evaluaciones de riesgo</p>
        <p className="mt-1 text-sm text-slate-300">El sistema evalúa las zonas cada hora.</p>
      </section>
    )
  }

  const info = RISK_LEVELS[worst.assessment.level]
  const calm = info.severity === 0
  return (
    <section
      aria-labelledby="estado-region"
      className={`rounded-lg bg-linear-to-br ${info.hero} p-5 text-white`}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-white/15 p-2.5">
          {calm ? <IconShield className="size-6" /> : <IconAlert className="size-6" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Estado de la región</p>
          <h2 id="estado-region" className="text-2xl font-bold leading-tight">
            {calm ? 'Sin alertas activas' : `${alertLabel(translator, worst.assessment.level)} activa`}
          </h2>
        </div>
      </div>

      {!calm && (
        <Link
          to={`/zona/${worst.zone.id}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white/15 px-4 py-3 transition hover:bg-white/25"
        >
          <span className="min-w-0">
            <span className="block text-xs text-white/80">Zona más crítica</span>
            <span className="block truncate font-semibold">{worst.zone.name}</span>
          </span>
          <IconChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[...LEVEL_ORDER].reverse().map((lvl) => (
          <div key={lvl} className="rounded-md bg-black/15 px-1 py-2">
            <dt className="text-[11px] leading-tight text-white/80">{levelLabel(translator, lvl)}</dt>
            <dd className="text-xl font-bold tabular-nums">{counts[lvl]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-white/75">
        Evaluado <RelativeTime iso={worst.assessment.assessed_at} /> con el modelo de IA
        {counts.SIN_EVALUAR > 0 && ` · ${counts.SIN_EVALUAR} zona(s) sin evaluar`}
      </p>
    </section>
  )
}
