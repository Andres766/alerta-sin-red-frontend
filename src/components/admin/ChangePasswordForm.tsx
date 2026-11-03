import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { ApiError } from '../../infrastructure/http/ApiClient'
import { adminService } from '../../services'

const MIN_LENGTH = 12

/** Cambio de la contraseña propia: las demás sesiones abiertas quedan cerradas. */
export function ChangePasswordForm({ token }: { token: string }) {
  const { replaceToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (next.length < MIN_LENGTH) {
      setMessage({ ok: false, text: `La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.` })
      return
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: 'La confirmación no coincide con la nueva contraseña.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const fresh = await adminService.changePassword(token, current, next)
      replaceToken(fresh.access_token, fresh.expires_in)
      setMessage({ ok: true, text: 'Contraseña actualizada. Las demás sesiones abiertas se cerraron.' })
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 401
          ? 'La contraseña actual no es correcta.'
          : err instanceof ApiError && err.status === 429
            ? 'Demasiados intentos. Espere unos minutos.'
            : err instanceof Error
              ? err.message
              : 'No se pudo cambiar la contraseña.'
      setMessage({ ok: false, text })
    } finally {
      setCurrent('')
      setNext('')
      setConfirm('')
      setBusy(false)
    }
  }

  const field = 'w-full rounded-xl border border-slate-300 px-3 py-2.5'
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Mi cuenta: cambiar contraseña</h2>
      <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-3">
        <input type="password" required autoComplete="current-password" placeholder="Contraseña actual"
          aria-label="Contraseña actual" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
        <input type="password" required minLength={MIN_LENGTH} autoComplete="new-password"
          placeholder={`Nueva (mín. ${MIN_LENGTH})`} aria-label="Nueva contraseña"
          value={next} onChange={(e) => setNext(e.target.value)} className={field} />
        <input type="password" required autoComplete="new-password" placeholder="Repita la nueva"
          aria-label="Confirmar nueva contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
        <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60 sm:col-span-3 sm:justify-self-start">
          {busy ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      )}
    </section>
  )
}
