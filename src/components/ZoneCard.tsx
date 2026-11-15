import { Link } from 'react-router-dom'
import { RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { hazardLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'
import { HazardIcon } from './HazardIcon'
import { IconChevronRight } from './icons'
import { RelativeTime } from './RelativeTime'
import { RiskBadge } from './RiskBadge'

/**
 * Fila de una zona. Va dentro de un <ZoneList> (panel con divisores): el color
 * del nivel está en la franja izquierda y en la insignia, no en todo el fondo.
 */
export function ZoneCard({ item, distanceKm }: { item: ZoneRisk; distanceKm?: number }) {
  const translator = useI18n()
  const { t, number } = translator
  const { zone, assessment } = item
  const info = assessment ? RISK_LEVELS[assessment.level] : null
  return (
    <Link
      to={`/zona/${zone.id}`}
      className="group relative flex items-center gap-3 py-3 pl-5 pr-3 transition hover:bg-raised"
    >
      <span aria-hidden className={`absolute inset-y-2 left-0 w-1 rounded-r ${info?.stripe ?? 'bg-risk-none'}`} />
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-raised text-muted">
        <HazardIcon hazard={zone.hazard_type} className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-snug">{zone.name}</span>
        <span className="mt-0.5 block text-sm text-muted">
          {hazardLabel(translator, zone.hazard_type)} · {zone.municipality}
          {distanceKm !== undefined && ` · ${t('zone.distance', { km: number(distanceKm) })}`}
        </span>
        <span className="mt-1.5 block sm:hidden">
          <RiskBadge level={assessment?.level ?? null} />
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {assessment && (
          <span className="hidden text-right text-xs leading-tight text-muted md:block">
            <span className="num block">{t('zone.confidence', { pct: Math.round(assessment.probability * 100) })}</span>
            <RelativeTime iso={assessment.assessed_at} />
          </span>
        )}
        <span className="hidden sm:inline-flex">
          <RiskBadge level={assessment?.level ?? null} />
        </span>
        <IconChevronRight className="size-4 text-faint transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** Panel con divisores que agrupa filas de zonas. */
export function ZoneList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-rule overflow-hidden rounded-lg border border-line bg-surface">{children}</div>
}
