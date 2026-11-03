import { useEffect, useState } from 'react'
import { preferences } from '../services'
import { IconBell } from './icons'

type Status = 'unsupported' | 'denied' | 'off' | 'on'

/** Activa los avisos en este celular cuando "mi zona" sube a riesgo alto. */
export function DeviceAlertsToggle() {
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
      <p className="text-xs text-slate-500">
        Las notificaciones están bloqueadas para este sitio; actívelas en la configuración del navegador.
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={status === 'on'}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${status === 'on' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
    >
      <IconBell className="size-4" />
      {status === 'on' ? 'Avisos en este celular: activados' : 'Avisarme en este celular'}
    </button>
  )
}
