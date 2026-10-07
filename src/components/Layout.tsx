import { NavLink, Outlet } from 'react-router-dom'
import { ConnectionBanner } from './ConnectionBanner'
import { UpdatePrompt } from './UpdatePrompt'

const links = [
  { to: '/', label: 'Mi zona' },
  { to: '/suscribirme', label: 'Alertas SMS' },
  { to: '/operador', label: 'Operador' },
]

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" aria-label="AlertaSinRed, inicio" className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/icons/icon.svg" alt="" className="size-7" />
            <span className="hidden sm:inline">AlertaSinRed</span>
          </NavLink>
          <nav aria-label="Principal" className="flex gap-1 text-sm">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-2.5 py-1.5 ${isActive ? 'bg-white/15 font-semibold' : 'text-slate-300 hover:text-white'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <ConnectionBanner />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        En emergencia llame al <strong>123</strong> · Datos: Open-Meteo, SGC · Proyecto académico UCC Pasto
      </footer>
      <UpdatePrompt />
    </div>
  )
}
