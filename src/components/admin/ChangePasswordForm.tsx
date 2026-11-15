import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import { ApiError } from '../../infrastructure/http/ApiClient'
import { adminService } from '../../services'
import { Card, Field, field, Message, primaryButton } from './ui'

const MIN_LENGTH = 12

/** Cambio de la contraseña propia: las demás sesiones abiertas quedan cerradas. */
export function ChangePasswordForm({ token }: { token: string }) {
  const { t } = useI18n()
  const { replaceToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (next.length < MIN_LENGTH) {
      setMessage({ ok: false, text: t('admin.passwordTooShort', { min: MIN_LENGTH }) })
      return
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: t('pw.mismatch') })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const fresh = await adminService.changePassword(token, current, next)
      replaceToken(fresh.access_token, fresh.expires_in)
      setMessage({ ok: true, text: t('pw.done') })
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 401
          ? t('pw.wrong')
          : err instanceof ApiError && err.status === 429
            ? t('admin.tooMany')
            : err instanceof Error
              ? err.message
              : t('pw.failed')
      setMessage({ ok: false, text })
    } finally {
      setCurrent('')
      setNext('')
      setConfirm('')
      setBusy(false)
    }
  }

  return (
    <Card title={t('pw.title')} lead={t('pw.lead')}>
      <form onSubmit={submit} className="grid max-w-md gap-4">
        <Field label={t('pw.current')}>
          <input type="password" required autoComplete="current-password"
            value={current} onChange={(e) => setCurrent(e.target.value)} className={field} />
        </Field>
        <Field label={t('pw.new', { min: MIN_LENGTH })}>
          <input type="password" required minLength={MIN_LENGTH} autoComplete="new-password"
            value={next} onChange={(e) => setNext(e.target.value)} className={field} />
        </Field>
        <Field label={t('pw.confirm')}>
          <input type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} className={primaryButton}>{busy ? t('pw.saving') : t('pw.submit')}</button>
          {message && <Message ok={message.ok}>{message.text}</Message>}
        </div>
      </form>
    </Card>
  )
}
