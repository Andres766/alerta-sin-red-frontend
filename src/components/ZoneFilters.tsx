import { RISK_LEVELS } from '../domain/riskLevel'
import type { LevelFilter } from '../domain/zoneFilter'

const OPTIONS: { value: LevelFilter; label: string; dot: string }[] = [
  { value: 'MUY_ALTO', label: RISK_LEVELS.MUY_ALTO.label, dot: RISK_LEVELS.MUY_ALTO.stripe },
  { value: 'ALTO', label: RISK_LEVELS.ALTO.label, dot: RISK_LEVELS.ALTO.stripe },
  { value: 'MODERADO', label: RISK_LEVELS.MODERADO.label, dot: RISK_LEVELS.MODERADO.stripe },
  { value: 'BAJO', label: RISK_LEVELS.BAJO.label, dot: RISK_LEVELS.BAJO.stripe },
  { value: 'SIN_EVALUAR', label: 'Sin evaluar', dot: 'bg-slate-400' },
]

interface Props {
  query: string
  onQuery: (value: string) => void
  levels: ReadonlySet<LevelFilter>
  onToggleLevel: (level: LevelFilter) => void
}

export function ZoneFilters({ query, onQuery, levels, onToggleLevel }: Props) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">Buscar zona por nombre o municipio</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por zona o municipio…"
          maxLength={60}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5"
        />
      </label>
      <div role="group" aria-label="Filtrar por nivel de riesgo" className="flex flex-wrap gap-1.5">
        {OPTIONS.map((o) => {
          const active = levels.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleLevel(o.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <span className={`size-2 rounded-full ${o.dot}`} aria-hidden />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
