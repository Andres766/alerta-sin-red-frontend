import { RISK_LEVELS } from '../domain/riskLevel'
import { colombiaToday, lastDays } from '../domain/time'
import type { DayRisk } from '../domain/types'
import { levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

/**
 * Una barra por día con el peor nivel de riesgo de ese día (hora de Colombia).
 * La altura y el color dicen lo mismo, así se lee también sin distinguir colores.
 * Los días sin evaluaciones se ven como una línea gris, no como "riesgo bajo".
 */
export function DailyRiskStrip({ days, total = 30 }: { days: DayRisk[]; total?: number }) {
  const translator = useI18n()
  const { t, locale } = translator
  const byDay = new Map(days.map((d) => [d.day, d]))
  const slots = lastDays(colombiaToday(), total)
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const label = (day: string) => format.format(new Date(`${day}T00:00:00Z`))
  const alertDays = slots.filter((day) => {
    const d = byDay.get(day)
    return d !== undefined && RISK_LEVELS[d.level].severity >= 2
  }).length
  const summary = t('zone.alertDays', { count: alertDays, total })

  return (
    <figure>
      <figcaption className="text-sm">
        <span className="block font-medium">{t('zone.last30')}</span>
        <span className="block text-muted">{summary}</span>
      </figcaption>
      <div
        role="img"
        aria-label={t('zone.stripLabel', { summary })}
        className="mt-3 flex h-16 items-end gap-0.75"
      >
        {slots.map((day) => {
          const d = byDay.get(day)
          if (!d) {
            return (
              <div key={day} title={t('zone.dayEmpty', { date: label(day) })} className="h-1 flex-1 rounded-sm bg-active" />
            )
          }
          const info = RISK_LEVELS[d.level]
          return (
            <div
              key={day}
              title={t('zone.dayTitle', {
                date: label(day),
                level: levelLabel(translator, d.level).toLocaleLowerCase(locale),
                count: d.evaluations,
              })}
              className={`flex-1 rounded-t-sm ${info.stripe}`}
              style={{ height: `${28 + info.severity * 24}%` }}
            />
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-faint" aria-hidden>
        <span>{label(slots[0]!)}</span>
        <span>{t('zone.today')}</span>
      </div>
    </figure>
  )
}
