import { RISK_LEVELS } from '../domain/riskLevel'
import type { Assessment, HazardType, RiskLevel, ZoneRisk } from '../domain/types'
import { es, type MessageKey } from './es'
import { recommendationKeys, type Translator } from './translator'

/** Textos del dominio en el idioma activo. Todo recibe el traductor: sin estado global. */

export function levelLabel({ t }: Translator, level: RiskLevel | null | undefined): string {
  return t(`risk.level.${level ?? 'SIN_EVALUAR'}`)
}

export function alertLabel({ t }: Translator, level: RiskLevel): string {
  return t(`risk.alert.${level}`)
}

export function recommendations({ t }: Translator, level: RiskLevel): string[] {
  return recommendationKeys(level).map((key) => t(key))
}

export function hazardLabel({ t }: Translator, hazard: HazardType): string {
  return t(`hazard.${hazard}`)
}

/** Nombre legible de una variable del modelo (o la clave tal cual si no se conoce). */
export function featureLabel({ t }: Translator, name: string): string {
  const key = `feature.${name}`
  return key in es ? t(key as MessageKey) : name
}

/**
 * Factores que explican el nivel, calculados en el dispositivo a partir de las
 * variables (mismos umbrales que Features.key_factors del backend) para poder
 * mostrarlos en cualquier idioma.
 */
export function keyFactors({ t, number }: Translator, features: Assessment['features']): string[] {
  const f = (name: string) => features[name] ?? 0
  const factors: string[] = []
  if (f('rain_72h_mm') >= 60) factors.push(t('factor.rain72.veryHigh', { mm: number(f('rain_72h_mm'), 0) }))
  else if (f('rain_72h_mm') >= 30) factors.push(t('factor.rain72.high', { mm: number(f('rain_72h_mm'), 0) }))
  if (f('rain_forecast_24h_mm') >= 25) factors.push(t('factor.forecast', { mm: number(f('rain_forecast_24h_mm'), 0) }))
  if (f('soil_moisture') >= 0.4) factors.push(t('factor.soil'))
  if (f('river_discharge_ratio') >= 1.5) factors.push(t('factor.discharge', { ratio: number(f('river_discharge_ratio'), 1) }))
  if (f('susceptibility') >= 4) factors.push(t('factor.susceptibility'))
  if (f('slope_deg') >= 25) factors.push(t('factor.slope', { deg: number(f('slope_deg'), 0) }))
  return factors
}

/** Texto para compartir una zona por mensajería: breve, con la acción principal y el 123. */
export function buildShareText(translator: Translator, { zone, assessment }: ZoneRisk, url: string): string {
  const { t } = translator
  if (!assessment) return t('share.noAssessment', { zone: zone.name, url })
  const level = assessment.level
  const lines = [
    t('share.headline', {
      alert: alertLabel(translator, level).toLocaleUpperCase(translator.locale),
      zone: zone.name,
      level: levelLabel(translator, level).toLocaleLowerCase(translator.locale),
    }),
    recommendations(translator, level)[0] ?? '',
    RISK_LEVELS[level].severity >= 2 ? t('share.call') : '',
    t('share.more', { url }),
  ]
  return lines.filter(Boolean).join('\n')
}
