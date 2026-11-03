import { describe, expect, it } from 'vitest'
import { isStale, latestIso, timeAgo } from './time'

const NOW = Date.parse('2026-11-02T12:00:00Z')

describe('tiempo y antigüedad de los datos', () => {
  it('describe el tiempo transcurrido en español', () => {
    expect(timeAgo('2026-11-02T11:55:00Z', NOW)).toBe('hace 5 minutos')
    expect(timeAgo('2026-11-02T09:00:00Z', NOW)).toBe('hace 3 horas')
  })

  it('marca como desactualizado lo que pasa de 3 horas', () => {
    expect(isStale('2026-11-02T09:30:00Z', NOW)).toBe(false)
    expect(isStale('2026-11-02T08:59:00Z', NOW)).toBe(true)
  })

  it('encuentra la evaluación más reciente ignorando vacíos', () => {
    expect(latestIso([null, '2026-11-02T08:00:00Z', undefined, '2026-11-02T10:00:00Z'])).toBe('2026-11-02T10:00:00Z')
    expect(latestIso([null, undefined])).toBeNull()
  })
})
