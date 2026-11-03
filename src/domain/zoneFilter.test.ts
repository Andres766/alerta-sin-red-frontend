import { describe, expect, it } from 'vitest'
import type { Assessment, RiskLevel, ZoneRisk } from './types'
import { filterZones, normalizeText, type LevelFilter } from './zoneFilter'

const zone = (name: string, municipality: string, level: RiskLevel | null): ZoneRisk => ({
  zone: {
    id: name, name, municipality, department: municipality === 'Mocoa' ? 'Putumayo' : 'Nariño',
    hazard_type: 'CRECIENTE', susceptibility: 3, slope_deg: 5, latitude: 1, longitude: -77,
  },
  assessment: level ? ({ level } as Assessment) : null,
})

const items = [
  zone('Barbacoas - Río Telembí', 'Barbacoas', 'MUY_ALTO'),
  zone('Pasto - Laderas de Aranda', 'Pasto', 'ALTO'),
  zone('Pasto - Ribera del río Pasto', 'Pasto', 'MODERADO'),
  zone('Mocoa - Barrio San Miguel', 'Mocoa', null),
]
const none = new Set<LevelFilter>()
const names = (list: ZoneRisk[]) => list.map((i) => i.zone.name)

describe('filtro de zonas', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizeText('  Río TELEMBÍ ')).toBe('rio telembi')
    expect(names(filterZones(items, 'rio telembi', none))).toEqual(['Barbacoas - Río Telembí'])
  })

  it('exige todas las palabras y busca también en municipio y departamento', () => {
    expect(names(filterZones(items, 'pasto rio', none))).toEqual(['Pasto - Ribera del río Pasto'])
    expect(names(filterZones(items, 'putumayo', none))).toEqual(['Mocoa - Barrio San Miguel'])
  })

  it('filtra por niveles, incluidas las zonas sin evaluar', () => {
    expect(names(filterZones(items, '', new Set<LevelFilter>(['ALTO', 'MUY_ALTO'])))).toHaveLength(2)
    expect(names(filterZones(items, '', new Set<LevelFilter>(['SIN_EVALUAR'])))).toEqual(['Mocoa - Barrio San Miguel'])
  })

  it('sin texto ni niveles devuelve todo', () => {
    expect(filterZones(items, '   ', none)).toHaveLength(4)
  })
})
