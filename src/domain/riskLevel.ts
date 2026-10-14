import type { HazardType, RiskLevel, ZoneRisk } from './types'

interface RiskLevelInfo {
  label: string
  alert: string
  severity: number
  /** Color del nivel para SVG (mapa esquemático). */
  hex: string
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
    hex: '#15803d',
    badge: 'bg-risk-low text-white',
    surface: 'border-risk-low/30 bg-white',
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
    hex: '#ca8a04',
    badge: 'bg-risk-moderate text-slate-950',
    surface: 'border-risk-moderate/40 bg-white',
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
    hex: '#ea580c',
    badge: 'bg-risk-high text-white',
    surface: 'border-risk-high/40 bg-orange-50/60',
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
    hex: '#dc2626',
    badge: 'bg-risk-extreme text-white',
    surface: 'border-risk-extreme/40 bg-red-50/70',
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

export const NOT_EVALUATED_HEX = '#94a3b8'

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
