import type { ComponentType, SVGProps } from 'react'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import { IconMonitor, IconMoon, IconSun } from './icons'
import type { MessageKey } from '../i18n/es'
import { useI18n } from '../i18n/I18nProvider'

const OPTIONS: { mode: ThemeMode; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { mode: 'light', label: 'prefs.theme.light', icon: IconSun },
  { mode: 'dark', label: 'prefs.theme.dark', icon: IconMoon },
  { mode: 'system', label: 'prefs.theme.system', icon: IconMonitor },
]

/** Control segmentado: tema claro, oscuro o el del sistema. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const { mode, setMode } = useTheme()
  return (
    <div role="radiogroup" aria-label={t('prefs.theme')} className={`inline-flex rounded-md border border-line bg-raised p-0.5 ${className}`}>
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
