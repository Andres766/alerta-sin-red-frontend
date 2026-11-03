import { RISK_LEVELS } from './riskLevel'
import type { ZoneRisk } from './types'

/** Texto para compartir una zona por mensajería: breve, con la acción principal y el 123. */
export function buildShareText({ zone, assessment }: ZoneRisk, url: string): string {
  if (!assessment) {
    return `AlertaSinRed: consulte el riesgo de deslizamiento y creciente en ${zone.name}. ${url}`
  }
  const info = RISK_LEVELS[assessment.level]
  const action = info.recommendations[0] ?? ''
  const lines = [
    `${info.alert.toUpperCase()} · ${zone.name}: riesgo ${info.label.toLowerCase()}.`,
    action,
    info.severity >= 2 ? 'En emergencia llame al 123.' : '',
    `Más información: ${url}`,
  ]
  return lines.filter(Boolean).join('\n')
}
