import { RISK_LEVELS } from '../domain/riskLevel'
import type { RiskLevel } from '../domain/types'

export function RiskBadge({ level, large = false }: { level: RiskLevel | null; large?: boolean }) {
  const size = large ? 'px-4 py-1.5 text-base' : 'px-2.5 py-0.5 text-xs'
  if (!level) {
    return (
      <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full bg-slate-200 font-semibold text-slate-700 ${size}`}>
        Sin evaluar
      </span>
    )
  }
  const info = RISK_LEVELS[level]
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full font-semibold ${info.badge} ${size}`}>
      Riesgo {info.label.toLowerCase()}
    </span>
  )
}
