import { Link } from 'react-router-dom'
import { countByLevel, LEVEL_ORDER, mostSevere, RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { alertLabel, levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'
import { rich } from '../i18n/rich'
import { IconChevronRight } from './icons'
import { RelativeTime } from './RelativeTime'

/** Bordes de las 4 celdas: 2×2 en celular, 4 en fila desde 640 px. */
const CELL_BORDERS = ['border-b sm:border-b-0', 'border-b border-l sm:border-b-0', 'sm:border-l', 'border-l']

/**
 * Lo primero que ve la persona: ¿hay alguna alerta activa en la región?
 * Una franja dividida: el estado general y, a la derecha, cuántas zonas hay
 * en cada nivel. El color va solo en los datos (punto y cifra del nivel).
 */
export function RegionStatus({ items }: { items: ZoneRisk[] }) {
  const translator = useI18n()
  const { t } = translator
  const worst = mostSevere(items)
  const counts = countByLevel(items)

  if (!worst?.assessment) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <p className="text-xs font-medium text-muted">{t('region.label')}</p>
        <p className="mt-1 text-lg font-semibold">{t('region.none')}</p>
        <p className="mt-0.5 text-sm text-muted">{t('region.noneHint')}</p>
      </section>
    )
  }

  const level = worst.assessment.level
  const info = RISK_LEVELS[level]
  const calm = info.severity === 0
  return (
    <section
      aria-labelledby="estado-region"
      className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)]"
    >
      <div className="relative p-5">
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${info.stripe}`} />
        <p className="text-xs font-medium text-muted">{t('region.label')}</p>
        <h2 id="estado-region" className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: info.color }} aria-hidden />
          {calm ? t('region.calm') : t('region.active', { alert: alertLabel(translator, level) })}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {rich(t('region.assessedBy'), { ago: <RelativeTime iso={worst.assessment.assessed_at} /> })}
          {counts.SIN_EVALUAR > 0 && ` · ${t('region.unassessed', { count: counts.SIN_EVALUAR })}`}
        </p>
        {!calm && (
          <Link
            to={`/zona/${worst.zone.id}`}
            className="group mt-4 flex items-center justify-between gap-3 rounded-md border border-line bg-raised px-3.5 py-2.5 transition hover:border-control"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted">{t('region.worst')}</span>
              <span className="block truncate font-medium">{worst.zone.name}</span>
            </span>
            <IconChevronRight className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <dl
        aria-label={t('region.counts')}
        className="grid grid-cols-2 border-t border-line sm:grid-cols-4 lg:border-l lg:border-t-0"
      >
        {[...LEVEL_ORDER].reverse().map((lvl, i) => (
          <div
            key={lvl}
            className={`flex flex-col justify-between gap-2 border-line p-4 sm:p-5 ${CELL_BORDERS[i]}`}
          >
            <dt className="flex items-center gap-1.5 text-sm text-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: RISK_LEVELS[lvl].color }} aria-hidden />
              {levelLabel(translator, lvl)}
            </dt>
            <dd className={`num text-2xl font-semibold sm:text-3xl tracking-tight ${counts[lvl] === 0 ? 'text-faint' : ''}`}>
              {counts[lvl]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
