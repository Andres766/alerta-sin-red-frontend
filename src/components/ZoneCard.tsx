import { Link } from 'react-router-dom'
import { HAZARD_LABEL, RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { HazardIcon } from './HazardIcon'
import { IconChevronRight } from './icons'
import { RelativeTime } from './RelativeTime'
import { RiskBadge } from './RiskBadge'

export function ZoneCard({ item, distanceKm }: { item: ZoneRisk; distanceKm?: number }) {
  const { zone, assessment } = item
  const info = assessment ? RISK_LEVELS[assessment.level] : null
  return (
    <Link
      to={`/zona/${zone.id}`}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border py-3.5 pl-5 pr-3 transition hover:-translate-y-0.5 hover: ${info?.surface ?? 'border-line bg-surface'}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${info?.stripe ?? 'bg-slate-300'}`} />
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-raised text-fg">
        <HazardIcon hazard={zone.hazard_type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold leading-snug">{zone.name}</span>
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {HAZARD_LABEL[zone.hazard_type]} · {zone.municipality}
          {distanceKm !== undefined && ` · a ${distanceKm.toFixed(1)} km`}
        </span>
        <span className="mt-1.5 block sm:hidden">
          <RiskBadge level={assessment?.level ?? null} />
        </span>
        {assessment && (
          <span className="mt-1 block text-xs text-muted">
            Confianza {Math.round(assessment.probability * 100)} % · <RelativeTime iso={assessment.assessed_at} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="hidden sm:inline-flex">
          <RiskBadge level={assessment?.level ?? null} />
        </span>
        <IconChevronRight className="size-4 text-faint transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
