import { useRegisterSW } from 'virtual:pwa-register/react'

/** Avisa cuando hay una versión nueva de la app en lugar de recargar por sorpresa. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      void registerPeriodicSync(registration)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-lg">
      <span>Hay una nueva versión disponible.</span>
      <div className="flex gap-2">
        <button className="rounded-lg px-3 py-1.5 text-slate-300" onClick={() => setNeedRefresh(false)}>
          Luego
        </button>
        <button
          className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-900"
          onClick={() => void updateServiceWorker(true)}
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}

/** Periodic Background Sync: solo Chrome/Edge con la PWA instalada; si no, se ignora. */
async function registerPeriodicSync(registration: ServiceWorkerRegistration | undefined) {
  const periodic = (registration as { periodicSync?: { register(tag: string, o: object): Promise<void> } } | undefined)
    ?.periodicSync
  if (!periodic) return
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (status.state === 'granted') await periodic.register('refresh-risk', { minInterval: 60 * 60 * 1000 })
  } catch {
    /* navegador sin soporte */
  }
}
