import type { RiskLevel, ZoneRisk } from './types'

/**
 * Datos visuales de cada nivel. Los textos (nombre, alerta, recomendaciones)
 * viven en los diccionarios de i18n: ver src/i18n/domain.ts.
 */
interface RiskLevelInfo {
  severity: number
  /** Color del nivel como variable CSS (cambia con el tema claro u oscuro). */
  color: string
  /** Clases Tailwind precompuestas (Tailwind necesita ver los nombres completos). */
  badge: string
  surface: string
  stripe: string
  hero: string
}

export const RISK_LEVELS: Record<RiskLevel, RiskLevelInfo> = {
  BAJO: {
    severity: 0,
    color: 'var(--risk-low)',
    badge: 'bg-risk-low text-white dark:text-black',
    surface: 'border-line bg-surface',
    stripe: 'bg-risk-low',
    hero: 'from-green-700 to-green-800',
  },
  MODERADO: {
    severity: 1,
    color: 'var(--risk-moderate)',
    badge: 'bg-risk-moderate text-black',
    surface: 'border-line bg-surface',
    stripe: 'bg-risk-moderate',
    hero: 'from-yellow-600 to-amber-700',
  },
  ALTO: {
    severity: 2,
    color: 'var(--risk-high)',
    badge: 'bg-risk-high text-white dark:text-black',
    surface: 'border-risk-high/40 bg-risk-high/5',
    stripe: 'bg-risk-high',
    hero: 'from-orange-600 to-orange-700',
  },
  MUY_ALTO: {
    severity: 3,
    color: 'var(--risk-extreme)',
    badge: 'bg-risk-extreme text-white dark:text-black',
    surface: 'border-risk-extreme/40 bg-risk-extreme/5',
    stripe: 'bg-risk-extreme',
    hero: 'from-red-600 to-red-700',
  },
}

export const LEVEL_ORDER: RiskLevel[] = ['BAJO', 'MODERADO', 'ALTO', 'MUY_ALTO']

export const NOT_EVALUATED_COLOR = 'var(--risk-none)'

/** Unidad de cada variable del modelo (el nombre se traduce en i18n). */
export const FEATURE_UNIT: Record<string, string> = {
  rain_24h_mm: 'mm',
  rain_72h_mm: 'mm',
  rain_7d_mm: 'mm',
  rain_forecast_24h_mm: 'mm',
  soil_moisture: 'm³/m³',
  river_discharge_ratio: '×',
  slope_deg: '°',
  susceptibility: '/ 5',
}

/** Zona evaluada con el riesgo más alto (o null si nada ha sido evaluado). */
export function mostSevere(items: ZoneRisk[]): ZoneRisk | null {
  return items.reduce<ZoneRisk | null>((worst, item) => {
    if (!item.assessment) return worst
    if (!worst?.assessment) return item
    return RISK_LEVELS[item.assessment.level].severity >
      RISK_LEVELS[worst.assessment.level].severity
      ? item
      : worst
  }, null)
}

/** Cantidad de zonas por nivel (incluye las que aún no se evalúan). */
export function countByLevel(items: ZoneRisk[]): Record<RiskLevel | 'SIN_EVALUAR', number> {
  const counts = { BAJO: 0, MODERADO: 0, ALTO: 0, MUY_ALTO: 0, SIN_EVALUAR: 0 }
  for (const { assessment } of items) counts[assessment?.level ?? 'SIN_EVALUAR']++
  return counts
}
