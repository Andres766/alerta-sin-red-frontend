import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { countByLevel, mostSevere, RISK_LEVELS } from '../../domain/riskLevel'
import { useAuth } from '../../hooks/useAuth'
import { useSnapshot } from '../../hooks/useSnapshot'
import { alertLabel } from '../../i18n/domain'
import { useI18n } from '../../i18n/I18nProvider'
import { rich } from '../../i18n/rich'
import { ApiError } from '../../infrastructure/http/ApiClient'
import { IconEye, IconEyeOff, IconFileText, IconLock, IconSparkles, IconUsers } from '../icons'
import { RelativeTime } from '../RelativeTime'
import { Field, field, primaryButton } from './ui'

function Capability({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface text-muted">{icon}</span>
      <span className="text-sm">
        <span className="block font-medium">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  )
}

/** Estado real de la región: el mismo dato que ve la comunidad, también sin conexión. */
function RegionNow() {
  const translator = useI18n()
  const { t } = translator
  const { data } = useSnapshot()
  const items = data?.snapshot.items ?? []
  const worst = mostSevere(items)
  const counts = countByLevel(items)
  const level = worst?.assessment?.level
  const info = level ? RISK_LEVELS[level] : null
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">{t('login.now')}</p>
      {info && worst?.assessment ? (
        <>
          <p className="mt-1.5 flex items-center gap-2 font-semibold">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: info.color }} aria-hidden />
            {info.severity === 0 ? t('region.calm') : t('region.active', { alert: alertLabel(translator, worst.assessment.level) })}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {t('login.nowZones', { count: items.length })}
            {' · '}
            {rich(t('region.assessedBy'), { ago: <RelativeTime iso={worst.assessment.assessed_at} /> })}
            {counts.SIN_EVALUAR > 0 && ` · ${t('region.unassessed', { count: counts.SIN_EVALUAR })}`}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted">{t('login.nowNone')}</p>
      )}
    </div>
  )
}

/**
 * Pantalla de acceso: a la izquierda qué es el panel y el estado actual de la
 * región; a la derecha el formulario. En celular el formulario va primero.
 */
export function LoginForm() {
  const { t } = useI18n()
  const { login, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t('admin.tooMany') : t('admin.badCredentials'))
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[70vh] items-center">
      <div className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="order-2 border-t border-line bg-raised p-6 lg:order-1 lg:border-r lg:border-t-0 lg:p-10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('login.eyebrow')}</p>
          <h1 className="mt-2 max-w-md text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
          <p className="mt-2 max-w-md text-muted">{t('login.lead')}</p>

          <ul className="mt-8 space-y-5">
            <Capability icon={<IconSparkles className="size-4.5" />} title={t('login.cap1Title')}>{t('login.cap1')}</Capability>
            <Capability icon={<IconUsers className="size-4.5" />} title={t('login.cap2Title')}>{t('login.cap2')}</Capability>
            <Capability icon={<IconFileText className="size-4.5" />} title={t('login.cap3Title')}>{t('login.cap3')}</Capability>
          </ul>

          <div className="mt-8">
            <RegionNow />
          </div>
        </section>

        <form onSubmit={submit} className="order-1 flex flex-col p-6 lg:order-2 lg:p-10">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t('login.formTitle')}</h2>
            <p className="mt-1 text-sm text-muted">{t('login.formLead')}</p>
          </div>

          <div className="mt-6 space-y-4">
            {notice && (
              <p role="status" className="rounded-md border border-warning-line bg-warning-bg p-3 text-sm text-warning-ink">{notice}</p>
            )}
            <Field label={t('admin.email')}>
              <input type="email" required autoComplete="username" placeholder="correo@entidad.gov.co"
                value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </Field>
            <Field label={t('admin.password')}>
              <span className="relative block">
                <input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-11`} />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted transition hover:text-fg"
                >
                  {showPassword ? <IconEyeOff className="size-4.5" /> : <IconEye className="size-4.5" />}
                </button>
              </span>
            </Field>
            {error && (
              <p role="alert" className="rounded-md border border-negative-ink/30 bg-negative-bg p-3 text-sm text-negative-ink">{error}</p>
            )}
            <button type="submit" disabled={busy} className={`${primaryButton} w-full py-2.5`}>
              {busy ? t('admin.verifying') : t('admin.signIn')}
            </button>
          </div>

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-xs text-muted">
            <p className="flex gap-2">
              <IconLock className="mt-0.5 size-3.5 shrink-0" />
              <span>{t('login.audit')}</span>
            </p>
            <p>{t('login.noAccount')}</p>
            <Link to="/" className="inline-block font-medium text-fg underline underline-offset-2">{t('login.back')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
