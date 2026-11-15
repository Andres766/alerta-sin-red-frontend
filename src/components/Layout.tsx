import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { MessageKey } from '../i18n/es'
import { useI18n } from '../i18n/I18nProvider'
import { ConnectionBanner } from './ConnectionBanner'
import { ErrorBoundary } from './ErrorBoundary'
import { IconBell, IconHome, IconPhone, IconShield, IconSparkles } from './icons'
import { LanguageToggle } from './LanguageToggle'
import { RouteAnnouncer } from './RouteAnnouncer'
import { ThemeToggle } from './ThemeToggle'
import { UpdatePrompt } from './UpdatePrompt'

interface NavItem {
  to: string
  label: MessageKey
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const links: NavItem[] = [
  { to: '/', label: 'nav.zones', icon: IconHome },
  { to: '/suscribirme', label: 'nav.alerts', icon: IconBell },
  { to: '/como-funciona', label: 'nav.how', icon: IconSparkles },
  { to: '/operador', label: 'nav.operator', icon: IconShield },
]

function Brand({ wrap = false }: { wrap?: boolean }) {
  const { t } = useI18n()
  return (
    <NavLink to="/" aria-label={`${t('app.name')}, ${t('nav.zones')}`} className="flex min-w-0 items-center gap-2.5">
      <img src="/icons/icon.svg" alt="" className="size-8 shrink-0 rounded-md" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">{t('app.name')}</span>
        <span className={`block text-xs text-muted ${wrap ? '' : 'truncate'}`}>{t('app.scope')}</span>
      </span>
    </NavLink>
  )
}

/**
 * Estructura de la app.
 * - Escritorio (≥1024 px): barra lateral con nombre, alcance, navegación y preferencias;
 *   el contenido ocupa el resto en un lienzo de hasta 1200 px.
 * - Celular y tableta: barra superior compacta y navegación inferior al alcance del pulgar.
 */
export function Layout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-fg"
      >
        {t('app.skip')}
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ground px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand wrap />
        </div>
        <nav aria-label={t('nav.label')} className="mt-7 grid gap-0.5 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 transition ${isActive ? 'bg-active font-medium text-fg' : 'text-muted hover:bg-raised hover:text-fg'}`
              }
            >
              <l.icon className="size-4.5" />
              {t(l.label)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          <a href="tel:123" className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 transition hover:border-control">
            <IconPhone className="size-4.5 text-risk-extreme" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{t('shell.emergency')} · 123</span>
              <span className="block text-xs text-muted">{t('shell.emergencyLine')}</span>
            </span>
          </a>
          <div className="flex items-center justify-between gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <p className="text-[11px] leading-4 text-faint">{t('footer.data')}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior (celular y tableta) */}
        <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Brand />
            <div className="flex shrink-0 items-center gap-1.5">
              <LanguageToggle />
              <ThemeToggle compact />
            </div>
          </div>
        </header>
        <div className="sticky top-[57px] z-30 lg:top-0">
          <ConnectionBanner />
        </div>

        <RouteAnnouncer mainId="contenido" />
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-5 outline-none sm:px-6 lg:px-9 lg:pb-12 lg:pt-8"
        >
          {/* Un error en una pantalla no tumba la navegación; la key por ruta lo reinicia. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Navegación inferior (celular y tableta) */}
      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid grid-cols-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${isActive ? 'text-fg' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-active' : ''}`}>
                    <l.icon className="size-5" />
                  </span>
                  {t(l.label)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <UpdatePrompt />
    </div>
  )
}
