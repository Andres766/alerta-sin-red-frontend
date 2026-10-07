import type { HazardType, RiskLevel } from './types'

interface RiskLevelInfo {
  label: string
  alert: string
  severity: number
  /** Clases Tailwind precompuestas (Tailwind necesita ver los nombres completos). */
  badge: string
  surface: string
  recommendations: string[]
}

export const RISK_LEVELS: Record<RiskLevel, RiskLevelInfo> = {
  BAJO: {
    label: 'Bajo',
    alert: 'Sin alerta',
    severity: 0,
    badge: 'bg-risk-low text-white',
    surface: 'border-risk-low/40 bg-risk-low/5',
    recommendations: [
      'Condiciones normales para su zona.',
      'Mantenga actualizado su plan familiar de emergencia.',
    ],
  },
  MODERADO: {
    label: 'Moderado',
    alert: 'Alerta amarilla',
    severity: 1,
    badge: 'bg-risk-moderate text-slate-950',
    surface: 'border-risk-moderate/50 bg-risk-moderate/10',
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
    badge: 'bg-risk-high text-white',
    surface: 'border-risk-high/50 bg-risk-high/10',
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
    badge: 'bg-risk-extreme text-white',
    surface: 'border-risk-extreme/60 bg-risk-extreme/10',
    recommendations: [
      'Evacúe hacia una zona segura, alejada de laderas y cauces.',
      'No cruce ríos ni quebradas crecidas.',
      'Llame a la línea de emergencias 123.',
    ],
  },
}

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
