import type { HazardType } from '../domain/types'
import { IconMountain, IconWaves } from './icons'

export function HazardIcon({ hazard, className = 'size-5' }: { hazard: HazardType; className?: string }) {
  if (hazard === 'CRECIENTE') return <IconWaves className={className} />
  if (hazard === 'DESLIZAMIENTO') return <IconMountain className={className} />
  return (
    <span className={`relative inline-block ${className}`}>
      <IconMountain className="absolute inset-0 size-full" />
      <IconWaves className="absolute -bottom-1 -right-1 size-3/5 rounded bg-surface" />
    </span>
  )
}
