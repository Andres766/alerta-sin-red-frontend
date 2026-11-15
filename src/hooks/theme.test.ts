import { describe, expect, it } from 'vitest'
import { resolveTheme } from './useTheme'

describe('tema claro u oscuro', () => {
  it('respeta la elección explícita aunque el sistema diga otra cosa', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('en modo sistema sigue la preferencia del dispositivo', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
