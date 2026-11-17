import { describe, expect, it } from 'vitest'
import { colombiaToday, isStale, lastDays, latestIso, timeAgo } from './time'

const NOW = Date.parse('2026-11-02T12:00:00Z')

describe('tiempo y antigüedad de los datos', () => {
  it('describe el tiempo transcurrido en español', () => {
    expect(timeAgo('2026-11-02T11:55:00Z', NOW)).toBe('hace 5 minutos')
    expect(timeAgo('2026-11-02T09:00:00Z', NOW)).toBe('hace 3 horas')
  })

  it('un instante apenas en el futuro se muestra como "ahora"', () => {
    expect(timeAgo('2026-11-02T12:00:12Z', NOW)).toBe('ahora')
    expect(timeAgo('2026-11-02T12:00:12Z', NOW, 'en-US')).toBe('now')
  })

  it('marca como desactualizado lo que pasa de 3 horas', () => {
    expect(isStale('2026-11-02T09:30:00Z', NOW)).toBe(false)
    expect(isStale('2026-11-02T08:59:00Z', NOW)).toBe(true)
  })

  it('encuentra la evaluación más reciente ignorando vacíos', () => {
    expect(latestIso([null, '2026-11-02T08:00:00Z', undefined, '2026-11-02T10:00:00Z'])).toBe('2026-11-02T10:00:00Z')
    expect(latestIso([null, undefined])).toBeNull()
  })

  it('usa la fecha de Colombia, no la de UTC', () => {
    expect(colombiaToday(Date.parse('2026-11-17T03:00:00Z'))).toBe('2026-11-16')
    expect(colombiaToday(Date.parse('2026-11-17T05:00:00Z'))).toBe('2026-11-17')
  })

  it('lista los últimos días en orden, cruzando meses', () => {
    expect(lastDays('2026-11-02', 4)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(lastDays('2026-11-16', 30)).toHaveLength(30)
  })
})
