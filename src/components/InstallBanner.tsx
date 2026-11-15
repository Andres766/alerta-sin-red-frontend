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
    <aside aria-label="Instalar la aplicación" className="flex items-start gap-3 rounded-lg border border-info-line bg-info-bg p-4">
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 text-sm text-info-ink">
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
            <button onClick={() => void install()} className="rounded-md bg-info-ink px-3 py-1.5 font-semibold text-surface">
              Instalar
            </button>
          )}
          <button onClick={dismiss} className="rounded-md px-3 py-1.5 font-semibold text-info-ink hover:bg-info-bg">
            Ahora no
          </button>
        </div>
      </div>
    </aside>
  )
}
