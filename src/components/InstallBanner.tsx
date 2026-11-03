import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const DISMISS_KEY = 'alerta-sin-red:install-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false // almacenamiento bloqueado (modo privado): se muestra igual
  }
}

/** Invita a instalar la app: así abre como cualquier otra y funciona mejor sin conexión. */
export function InstallBanner() {
  const { mode, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (mode === 'none' || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* sin almacenamiento: solo se oculta en esta visita */
    }
  }

  return (
    <aside aria-label="Instalar la aplicación" className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm text-sky-950">
        <p className="font-semibold">Instale AlertaSinRed en su celular</p>
        {mode === 'prompt' ? (
          <p className="mt-0.5">Quedará en la pantalla de inicio y abrirá aunque no tenga internet.</p>
        ) : (
          <p className="mt-0.5">
            En Safari toque <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          {mode === 'prompt' && (
            <button onClick={() => void install()} className="rounded-xl bg-sky-900 px-3 py-1.5 font-semibold text-white">
              Instalar
            </button>
          )}
          <button onClick={dismiss} className="rounded-xl px-3 py-1.5 font-semibold text-sky-900 hover:bg-sky-100">
            Ahora no
          </button>
        </div>
      </div>
    </aside>
  )
}
