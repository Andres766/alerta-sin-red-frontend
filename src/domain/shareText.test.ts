import { describe, expect, it } from 'vitest'
import { buildShareText } from './shareText'
import type { Assessment, RiskLevel, ZoneRisk } from './types'

const item = (level: RiskLevel | null): ZoneRisk => ({
  zone: {
    id: 'z1', name: 'Mocoa - Barrio San Miguel', municipality: 'Mocoa', department: 'Putumayo',
    hazard_type: 'MIXTO', susceptibility: 5, slope_deg: 18, latitude: 1.15, longitude: -76.65,
  },
  assessment: level ? ({ level } as Assessment) : null,
})
const URL = 'https://alerta.example/zona/z1'

describe('texto para compartir', () => {
  it('en alerta roja incluye la acción principal, el 123 y el enlace', () => {
    const text = buildShareText(item('MUY_ALTO'), URL)
    expect(text).toContain('ALERTA ROJA · Mocoa - Barrio San Miguel: riesgo muy alto.')
    expect(text).toContain('Evacúe hacia una zona segura')
    expect(text).toContain('123')
    expect(text.endsWith(URL)).toBe(true)
  })

  it('en riesgo bajo no alarma con el 123', () => {
    expect(buildShareText(item('BAJO'), URL)).not.toContain('123')
  })

  it('sin evaluación invita a consultar', () => {
    expect(buildShareText(item(null), URL)).toContain('consulte el riesgo')
  })
})
