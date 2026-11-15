import { RISK_LEVELS } from '../domain/riskLevel'
import type { RiskLevel } from '../domain/types'
import { levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

export function RiskBadge({ level, large = false }: { level: RiskLevel | null; large?: boolean }) {
  const translator = useI18n()
  const size = large ? 'px-4 py-1.5 text-base' : 'px-2.5 py-0.5 text-xs'
  if (!level) {
    return (
      <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full bg-active font-semibold text-fg ${size}`}>
        {levelLabel(translator, null)}
      </span>
    )
  }
  const info = RISK_LEVELS[level]
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full font-semibold ${info.badge} ${size}`}>
      {capitalize(translator.t('risk.badge', { level: levelLabel(translator, level).toLocaleLowerCase(translator.locale) }))}
    </span>
  )
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1)
