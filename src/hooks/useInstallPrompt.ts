import { useCallback, useEffect, useState } from 'react'

/** Evento no estándar de Chrome/Edge/Android que permite mostrar el diálogo de instalación. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'prompt' | 'ios' | 'none'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Cómo se puede instalar la PWA en este navegador:
 *  - 'prompt': Chrome/Edge/Android ofrecen el diálogo nativo
 *  - 'ios': Safari no lo ofrece; hay que explicar "Compartir → Agregar a inicio"
 *  - 'none': ya está instalada o el navegador no lo permite
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault() // se muestra cuando la persona lo pida, no de golpe
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null) // el evento solo se puede usar una vez
  }, [deferred])

  const mode: InstallMode = installed ? 'none' : deferred ? 'prompt' : isIos() ? 'ios' : 'none'
  return { mode, install }
}
