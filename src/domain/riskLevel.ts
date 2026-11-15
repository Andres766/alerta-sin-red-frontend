import type { HazardType, RiskLevel, ZoneRisk } from './types'

interface RiskLevelInfo {
  label: string
  alert: string
  severity: number
  /** Color del nivel como variable CSS (cambia con el tema claro u oscuro). */
  color: string
  /** Clases Tailwind precompuestas (Tailwind necesita ver los nombres completos). */
  badge: string
  surface: string
  stripe: string
  hero: string
  recommendations: string[]
}

export const RISK_LEVELS: Record<RiskLevel, RiskLevelInfo> = {
  BAJO: {
    label: 'Bajo',
    alert: 'Sin alerta',
    severity: 0,
    color: 'var(--risk-low)',
    badge: 'bg-risk-low text-white dark:text-black',
    surface: 'border-line bg-surface',
    stripe: 'bg-risk-low',
    hero: 'from-green-700 to-green-800',
    recommendations: [
      'Condiciones normales para su zona.',
      'Mantenga actualizado su plan familiar de emergencia.',
    ],
  },
  MODERADO: {
    label: 'Moderado',
    alert: 'Alerta amarilla',
    severity: 1,
    color: 'var(--risk-moderate)',
    badge: 'bg-risk-moderate text-black',
    surface: 'border-line bg-surface',
    stripe: 'bg-risk-moderate',
    hero: 'from-yellow-600 to-amber-700',
    recommendations: [
      'Esté atento a los boletines de gestión del riesgo.',
      'Limpie canales, cunetas y desagües cercanos a su vivienda.',
      'Identifique la ruta de evacuación y el punto de encuentro.',
    ],
  },
  ALTO: {
    label: 'Alto',
    alert: 'Alerta naranja',
    severity: 2,
    color: 'var(--risk-high)',
    badge: 'bg-risk-high text-white dark:text-black',
    surface: 'border-risk-high/40 bg-risk-high/5',
    stripe: 'bg-risk-high',
    hero: 'from-orange-600 to-orange-700',
    recommendations: [
      'Prepare el kit de emergencia: agua, linterna, radio, botiquín y documentos.',
      'Observe grietas en muros o suelo, árboles inclinados o agua turbia en quebradas.',
      'Esté listo para evacuar ante cualquier señal.',
    ],
  },
  MUY_ALTO: {
    label: 'Muy alto',
    alert: 'Alerta roja',
    severity: 3,
    color: 'var(--risk-extreme)',
    badge: 'bg-risk-extreme text-white dark:text-black',
    surface: 'border-risk-extreme/40 bg-risk-extreme/5',
    stripe: 'bg-risk-extreme',
    hero: 'from-red-600 to-red-700',
    recommendations: [
      'Evacúe hacia una zona segura, alejada de laderas y cauces.',
      'No cruce ríos ni quebradas crecidas.',
      'Llame a la línea de emergencias 123.',
    ],
  },
}

export const LEVEL_ORDER: RiskLevel[] = ['BAJO', 'MODERADO', 'ALTO', 'MUY_ALTO']

export const NOT_EVALUATED_COLOR = 'var(--risk-none)'

export const HAZARD_LABEL: Record<HazardType, string> = {
  DESLIZAMIENTO: 'Deslizamiento',
  CRECIENTE: 'Creciente de río',
  MIXTO: 'Deslizamiento y creciente',
}

export const FEATURE_LABEL: Record<string, { label: string; unit: string }> = {
  rain_24h_mm: { label: 'Lluvia últimas 24 h', unit: 'mm' },
  rain_72h_mm: { label: 'Lluvia últimas 72 h', unit: 'mm' },
  rain_7d_mm: { label: 'Lluvia últimos 7 días', unit: 'mm' },
  rain_forecast_24h_mm: { label: 'Lluvia pronosticada 24 h', unit: 'mm' },
  soil_moisture: { label: 'Humedad del suelo', unit: 'm³/m³' },
  river_discharge_ratio: { label: 'Caudal vs. habitual', unit: '×' },
  slope_deg: { label: 'Pendiente del terreno', unit: '°' },
  susceptibility: { label: 'Susceptibilidad (SGC)', unit: '/ 5' },
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
