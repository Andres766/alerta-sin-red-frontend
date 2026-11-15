import { RISK_LEVELS } from '../domain/riskLevel'
import type { LevelFilter } from '../domain/zoneFilter'
import { levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

const OPTIONS: { value: LevelFilter; dot: string }[] = [
  { value: 'MUY_ALTO', dot: RISK_LEVELS.MUY_ALTO.stripe },
  { value: 'ALTO', dot: RISK_LEVELS.ALTO.stripe },
  { value: 'MODERADO', dot: RISK_LEVELS.MODERADO.stripe },
  { value: 'BAJO', dot: RISK_LEVELS.BAJO.stripe },
  { value: 'SIN_EVALUAR', dot: 'bg-risk-none' },
]

interface Props {
  query: string
  onQuery: (value: string) => void
  levels: ReadonlySet<LevelFilter>
  onToggleLevel: (level: LevelFilter) => void
}

export function ZoneFilters({ query, onQuery, levels, onToggleLevel }: Props) {
  const translator = useI18n()
  const { t } = translator
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">{t('filter.searchLabel')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('filter.search')}
          maxLength={60}
          className="w-full rounded-md border border-control bg-surface px-3 py-2"
        />
      </label>
      <div role="group" aria-label={t('filter.levels')} className="flex flex-wrap gap-1.5">
        {OPTIONS.map((o) => {
          const active = levels.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleLevel(o.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${active ? 'border-primary bg-primary text-on-primary' : 'border-control bg-surface text-fg hover:bg-raised'}`}
            >
              <span className={`size-2 rounded-full ${o.dot}`} aria-hidden />
              {levelLabel(translator, o.value === 'SIN_EVALUAR' ? null : o.value)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
