import { describe, expect, it } from 'vitest'
import { formatColombianMobile, isValidColombianMobile } from './phone'

describe('celular colombiano', () => {
  it('agrupa mientras se escribe', () => {
    expect(formatColombianMobile('3')).toBe('3')
    expect(formatColombianMobile('3001')).toBe('300 1')
    expect(formatColombianMobile('3001234567')).toBe('300 123 4567')
    expect(formatColombianMobile('300-123-4567')).toBe('300 123 4567')
  })

  it('respeta el indicativo +57 y descarta dígitos de más', () => {
    expect(formatColombianMobile('+573001234567')).toBe('+57 300 123 4567')
    expect(formatColombianMobile('573001234567')).toBe('+57 300 123 4567')
    expect(formatColombianMobile('30012345678999')).toBe('300 123 4567')
  })

  it('funciona tecla por tecla, como escribe una persona', () => {
    const typeInto = (keys: string) =>
      [...keys].reduce((value, key) => formatColombianMobile(value + key), '')
    expect(typeInto('+573101234567')).toBe('+57 310 123 4567')
    expect(typeInto('3101234567')).toBe('310 123 4567')
    expect(typeInto('+5')).toBe('+5')
  })

  it('valida solo móviles colombianos', () => {
    expect(isValidColombianMobile('300 123 4567')).toBe(true)
    expect(isValidColombianMobile('+57 300 123 4567')).toBe(true)
    expect(isValidColombianMobile('601 234 5678')).toBe(false) // fijo de Bogotá
    expect(isValidColombianMobile('300 123 456')).toBe(false)
  })
})
