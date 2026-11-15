import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ConnectionBanner } from './ConnectionBanner'
import { ErrorBoundary } from './ErrorBoundary'
import { IconBell, IconHome, IconShield } from './icons'
import { ThemeToggle } from './ThemeToggle'
import { UpdatePrompt } from './UpdatePrompt'
import { RouteAnnouncer } from './RouteAnnouncer'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const links: NavItem[] = [
  { to: '/', label: 'Mi zona', icon: IconHome },
  { to: '/suscribirme', label: 'Alertas SMS', icon: IconBell },
  { to: '/operador', label: 'Operador', icon: IconShield },
]

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-fg"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 bg-slate-900/95 text-white shadow backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" aria-label="AlertaSinRed, inicio" className="flex items-center gap-2.5 font-bold tracking-tight">
            <img src="/icons/icon.svg" alt="" className="size-8" />
            <span className="leading-tight">
              AlertaSinRed
              <span className="block text-[11px] font-normal text-faint">Riesgo climático · Nariño y Putumayo</span>
            </span>
          </NavLink>
          {/* Escritorio: navegación arriba */}
          <div className="flex items-center gap-3">
          <nav aria-label="Principal" className="hidden gap-1 text-sm sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 transition ${isActive ? 'bg-white/15 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                }
              >
                <l.icon className="size-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
          </div>
        </div>
        <ConnectionBanner />
      </header>

      <RouteAnnouncer mainId="contenido" />
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 outline-none sm:pb-10">
        {/* Un error en una pantalla no tumba la navegación; la key por ruta lo reinicia. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="hidden border-t border-line py-4 text-center text-xs text-muted sm:block">
        En emergencia llame al <strong>123</strong> ·{' '}
        <NavLink to="/como-funciona" className="underline hover:text-fg">Cómo funciona</NavLink> · Datos:
        Open-Meteo, SGC · Proyecto académico UCC Pasto
      </footer>

      {/* Móvil: barra inferior, al alcance del pulgar */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="grid grid-cols-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-fg' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-primary text-on-primary' : ''}`}>
                    <l.icon className="size-5" />
                  </span>
                  {l.label}
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
