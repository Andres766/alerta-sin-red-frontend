import { describe, expect, it } from 'vitest'
import type { Assessment, RiskLevel, ZoneRisk } from '../domain/types'
import { timeAgo } from '../domain/time'
import { buildShareText, keyFactors, levelLabel } from './domain'
import { en } from './en'
import { es } from './es'
import { createTranslator, detectLanguage } from './translator'

const ES = createTranslator('es')
const EN = createTranslator('en')

const item = (level: RiskLevel | null): ZoneRisk => ({
  zone: {
    id: 'z1', name: 'Mocoa - Barrio San Miguel', municipality: 'Mocoa', department: 'Putumayo',
    hazard_type: 'MIXTO', susceptibility: 5, slope_deg: 18, latitude: 1.15, longitude: -76.65,
  },
  assessment: level ? ({ level } as Assessment) : null,
})
const URL = 'https://alerta.example/zona/z1'

describe('diccionarios', () => {
  it('español e inglés tienen exactamente las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it('ningún texto queda vacío y los parámetros coinciden entre idiomas', () => {
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
    const keys = Object.keys(es) as (keyof typeof es)[]
    expect(keys.filter((key) => en[key].trim() === '')).toEqual([])
    expect(keys.filter((key) => params(en[key]).join() !== params(es[key]).join())).toEqual([])
  })

  it('completa los parámetros y deja intactos los desconocidos', () => {
    expect(ES.t('filter.showing', { shown: 2, total: 6 })).toBe('Mostrando 2 de 6 zonas')
    expect(EN.t('filter.showing', { shown: 2 })).toBe('Showing 2 of {total} zones')
  })

  it('elige el idioma guardado o el del navegador', () => {
    expect(detectLanguage('en', 'es-CO')).toBe('en')
    expect(detectLanguage(null, 'en-GB')).toBe('en')
    expect(detectLanguage('fr', 'es-CO')).toBe('es')
    expect(detectLanguage(null, undefined)).toBe('es')
  })
})

describe('textos del dominio', () => {
  it('traduce el nivel de riesgo', () => {
    expect(levelLabel(ES, 'MUY_ALTO')).toBe('Muy alto')
    expect(levelLabel(EN, 'MUY_ALTO')).toBe('Very high')
    expect(levelLabel(EN, null)).toBe('Not assessed')
  })

  it('explica los factores con los mismos umbrales del backend', () => {
    const features = { rain_72h_mm: 72.4, soil_moisture: 0.45, river_discharge_ratio: 2.06, slope_deg: 12, susceptibility: 5 }
    expect(keyFactors(ES, features)).toEqual([
      'Lluvia acumulada muy alta en 72 h (72 mm)',
      'Suelo saturado de agua',
      'Caudal del río 2,1 veces por encima de lo habitual',
      'Zona de susceptibilidad alta a movimientos en masa',
    ])
    expect(keyFactors(EN, features)[2]).toBe('River discharge 2.1 times above usual')
    expect(keyFactors(EN, { rain_72h_mm: 5 })).toEqual([])
  })

  it('describe el tiempo transcurrido en cada idioma', () => {
    const now = Date.parse('2026-11-02T12:00:00Z')
    expect(timeAgo('2026-11-02T11:55:00Z', now, ES.locale)).toBe('hace 5 minutos')
    expect(timeAgo('2026-11-02T09:00:00Z', now, EN.locale)).toBe('3 hours ago')
  })
})

describe('texto para compartir', () => {
  it('en alerta roja incluye la acción principal, el 123 y el enlace', () => {
    const text = buildShareText(ES, item('MUY_ALTO'), URL)
    expect(text).toContain('ALERTA ROJA · Mocoa - Barrio San Miguel: riesgo muy alto.')
    expect(text).toContain('Evacúe hacia una zona segura')
    expect(text).toContain('123')
    expect(text.endsWith(URL)).toBe(true)
  })

  it('en inglés usa el mismo formato', () => {
    expect(buildShareText(EN, item('MUY_ALTO'), URL)).toContain('RED ALERT · Mocoa - Barrio San Miguel: very high risk.')
  })

  it('en riesgo bajo no alarma con el 123', () => {
    expect(buildShareText(ES, item('BAJO'), URL)).not.toContain('123')
  })

  it('sin evaluación invita a consultar', () => {
    expect(buildShareText(ES, item(null), URL)).toContain('consulte el riesgo')
  })
})
