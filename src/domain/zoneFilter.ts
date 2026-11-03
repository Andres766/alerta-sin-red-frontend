import type { RiskLevel, ZoneRisk } from './types'

export type LevelFilter = RiskLevel | 'SIN_EVALUAR'

/** Minúsculas y sin tildes: "Río Telembí" coincide con "rio telembi". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Filtra zonas por texto (nombre, municipio o departamento) y por niveles de
 * riesgo. Sin niveles seleccionados se muestran todos.
 */
export function filterZones(items: ZoneRisk[], query: string, levels: ReadonlySet<LevelFilter>): ZoneRisk[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  return items.filter(({ zone, assessment }) => {
    const level: LevelFilter = assessment?.level ?? 'SIN_EVALUAR'
    if (levels.size > 0 && !levels.has(level)) return false
    const haystack = normalizeText(`${zone.name} ${zone.municipality} ${zone.department}`)
    return words.every((word) => haystack.includes(word))
  })
}
