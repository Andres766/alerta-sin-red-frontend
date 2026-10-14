import { describe, expect, it } from 'vitest'
import { countByLevel, mostSevere } from './riskLevel'
import type { Assessment, RiskLevel, ZoneRisk } from './types'

const item = (id: string, level: RiskLevel | null): ZoneRisk => ({
  zone: {
    id, name: id, municipality: id, department: 'Nariño', hazard_type: 'DESLIZAMIENTO',
    susceptibility: 3, slope_deg: 10, latitude: 1, longitude: -77,
  },
  assessment: level ? ({ level, probability: 0.8 } as Assessment) : null,
})

describe('resumen de riesgo', () => {
  it('identifica la zona más crítica', () => {
    const items = [item('a', 'MODERADO'), item('b', 'MUY_ALTO'), item('c', null), item('d', 'ALTO')]
    expect(mostSevere(items)?.zone.id).toBe('b')
  })

  it('devuelve null si nada ha sido evaluado', () => {
    expect(mostSevere([item('a', null)])).toBeNull()
  })

  it('cuenta zonas por nivel incluyendo las no evaluadas', () => {
    expect(countByLevel([item('a', 'ALTO'), item('b', 'ALTO'), item('c', null)])).toEqual({
      BAJO: 0, MODERADO: 0, ALTO: 2, MUY_ALTO: 0, SIN_EVALUAR: 1,
    })
  })
})
