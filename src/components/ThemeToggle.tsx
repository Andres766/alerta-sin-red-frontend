import type { ComponentType, SVGProps } from 'react'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import type { MessageKey } from '../i18n/es'
import { useI18n } from '../i18n/I18nProvider'
import { IconMonitor, IconMoon, IconSun } from './icons'

const OPTIONS: { mode: ThemeMode; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { mode: 'light', label: 'prefs.theme.light', icon: IconSun },
  { mode: 'dark', label: 'prefs.theme.dark', icon: IconMoon },
  { mode: 'system', label: 'prefs.theme.system', icon: IconMonitor },
]

/**
 * Tema claro, oscuro o el del sistema.
 * Normal: control segmentado. `compact` (barra superior del celular): un solo
 * botón que pasa al siguiente modo y anuncia el actual.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const { mode, setMode } = useTheme()

  if (compact) {
    const index = OPTIONS.findIndex((o) => o.mode === mode)
    const current = OPTIONS[index]!
    const next = OPTIONS[(index + 1) % OPTIONS.length]!
    const label = `${t('prefs.theme')}: ${t(current.label)}`
    return (
      <button
        type="button"
        onClick={() => setMode(next.mode)}
        aria-label={label}
        title={label}
        className="grid size-9 place-items-center rounded-md border border-line bg-raised text-fg transition hover:bg-active"
      >
        <current.icon className="size-4" />
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label={t('prefs.theme')} className="inline-flex rounded-md border border-line bg-raised p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={mode === o.mode}
          aria-label={t(o.label)}
          title={t(o.label)}
          onClick={() => setMode(o.mode)}
          className={`grid size-8 place-items-center rounded-[5px] transition ${mode === o.mode ? 'bg-surface text-fg ring-1 ring-line' : 'text-muted hover:text-fg'}`}
        >
          <o.icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
