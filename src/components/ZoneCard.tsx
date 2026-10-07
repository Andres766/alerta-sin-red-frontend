import { Link } from 'react-router-dom'
import { HAZARD_LABEL, RISK_LEVELS } from '../domain/riskLevel'
import { timeAgo } from '../domain/time'
import type { ZoneRisk } from '../domain/types'
import { RiskBadge } from './RiskBadge'

export function ZoneCard({ item, distanceKm }: { item: ZoneRisk; distanceKm?: number }) {
  const { zone, assessment } = item
  const surface = assessment ? RISK_LEVELS[assessment.level].surface : 'border-slate-200 bg-white'
  return (
    <Link
      to={`/zona/${zone.id}`}
      className={`block rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${surface}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{zone.name}</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {HAZARD_LABEL[zone.hazard_type]} · {zone.municipality}, {zone.department}
            {distanceKm !== undefined && ` · a ${distanceKm.toFixed(1)} km`}
          </p>
        </div>
        <RiskBadge level={assessment?.level ?? null} />
      </div>
      {assessment && (
        <p className="mt-3 text-xs text-slate-500">
          {RISK_LEVELS[assessment.level].alert} · confianza {Math.round(assessment.probability * 100)}
          % · evaluado {timeAgo(assessment.assessed_at)}
        </p>
      )}
    </Link>
  )
}
