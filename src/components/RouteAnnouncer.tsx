import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'

/**
 * En una SPA cambiar de ruta no recarga la página, así que el lector de pantalla
 * no se entera. Este componente anuncia el título de la página nueva y mueve el
 * foco al contenido principal (patrón recomendado para enrutamiento en cliente).
 */
export function RouteAnnouncer({ mainId }: { mainId: string }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [message, setMessage] = useState('')
  // En la carga inicial el navegador ya anuncia la página: solo se actúa al cambiar.
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    // Se espera un ciclo para que la página nueva haya fijado su título.
    const timer = window.setTimeout(() => {
      setMessage(document.title.replace(/ · AlertaSinRed$/, ''))
      const main = document.getElementById(mainId)
      main?.focus({ preventScroll: true })
      window.scrollTo({ top: 0 })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [pathname, mainId])

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {message && t('app.page', { title: message })}
    </p>
  )
}
