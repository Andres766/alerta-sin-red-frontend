import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useI18n } from '../i18n/I18nProvider'

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
  const { t } = useI18n()
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
    <aside aria-label={t('install.label')} className="flex items-start gap-3 rounded-lg border border-info-line bg-info-bg p-4">
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 text-sm text-info-ink">
        <p className="font-semibold">{t('install.title')}</p>
        {mode === 'prompt' ? (
          <p className="mt-0.5">{t('install.prompt')}</p>
        ) : (
          <p className="mt-0.5">{t('install.ios')}</p>
        )}
        <div className="mt-2 flex gap-2">
          {mode === 'prompt' && (
            <button onClick={() => void install()} className="rounded-md bg-info-ink px-3 py-1.5 font-semibold text-surface">
              {t('install.cta')}
            </button>
          )}
          <button onClick={dismiss} className="rounded-md px-3 py-1.5 font-semibold text-info-ink hover:bg-info-bg">
            {t('common.notNow')}
          </button>
        </div>
      </div>
    </aside>
  )
}
