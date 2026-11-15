import { useEffect, useState } from 'react'
import { preferences } from '../services'
import { IconBell } from './icons'
import { useI18n } from '../i18n/I18nProvider'

type Status = 'unsupported' | 'denied' | 'off' | 'on'

/** Activa los avisos en este celular cuando "mi zona" sube a riesgo alto. */
export function DeviceAlertsToggle() {
  const { t } = useI18n()
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator
  const [status, setStatus] = useState<Status>(supported ? 'off' : 'unsupported')

  useEffect(() => {
    if (!supported) return
    void preferences.notificationsEnabled().then((enabled) => {
      if (Notification.permission === 'denied') setStatus('denied')
      else setStatus(enabled && Notification.permission === 'granted' ? 'on' : 'off')
    })
  }, [supported])

  const toggle = async () => {
    if (status === 'on') {
      await preferences.setNotificationsEnabled(false)
      setStatus('off')
      return
    }
    // El permiso se pide solo cuando la persona lo solicita (buena práctica y requisito de los navegadores).
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'off')
      return
    }
    await preferences.setNotificationsEnabled(true)
    setStatus('on')
  }

  if (status === 'unsupported') return null
  if (status === 'denied') {
    return (
      <p className="text-xs text-muted">
        {t('deviceAlerts.blocked')}
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={status === 'on'}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${status === 'on' ? 'border-positive-ink/30 bg-positive-bg text-positive-ink' : 'border-control bg-surface text-fg hover:bg-raised'}`}
    >
      <IconBell className="size-4" />
      {status === 'on' ? t('deviceAlerts.on') : t('deviceAlerts.off')}
    </button>
  )
}
