import type { ComponentType, SVGProps } from 'react'
import { useTheme, type ThemeMode } from '../hooks/useTheme'
import { IconMonitor, IconMoon, IconSun } from './icons'

const OPTIONS: { mode: ThemeMode; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { mode: 'light', label: 'Claro', icon: IconSun },
  { mode: 'dark', label: 'Oscuro', icon: IconMoon },
  { mode: 'system', label: 'Sistema', icon: IconMonitor },
]

/** Control segmentado: tema claro, oscuro o el del sistema. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, setMode } = useTheme()
  return (
    <div role="radiogroup" aria-label="Tema" className={`inline-flex rounded-md border border-line bg-raised p-0.5 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={mode === o.mode}
          aria-label={o.label}
          title={o.label}
          onClick={() => setMode(o.mode)}
          className={`grid size-8 place-items-center rounded-[5px] transition ${mode === o.mode ? 'bg-surface text-fg ring-1 ring-line' : 'text-muted hover:text-fg'}`}
        >
          <o.icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
