import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChangePasswordForm } from '../components/admin/ChangePasswordForm'
import { AuditLogPanel, ExportCsvPanel, SmsTestPanel } from '../components/admin/OperationsTools'
import { Card, Field, field, Message, primaryButton, secondaryButton } from '../components/admin/ui'
import { ZonesPanel } from '../components/admin/ZonesPanel'
import { IconRefresh, IconShield } from '../components/icons'
import { RelativeTime } from '../components/RelativeTime'
import { RiskBadge } from '../components/RiskBadge'
import { LEVEL_ORDER, RISK_LEVELS } from '../domain/riskLevel'
import { formatDateTime } from '../domain/time'
import type { AlertRecord, DashboardStats, EvaluationResult, Role, UserAccount } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSnapshot } from '../hooks/useSnapshot'
import { levelLabel } from '../i18n/domain'
import type { MessageKey } from '../i18n/es'
import { useI18n } from '../i18n/I18nProvider'
import { ApiError } from '../infrastructure/http/ApiClient'
import { adminService } from '../services'

const roleKey = (role: Role): MessageKey => `admin.role.${role}`

/** Un 401 significa token vencido o cuenta desactivada: se cierra la sesión. */
function useApiErrorHandler() {
  const { logout } = useAuth()
  const { t } = useI18n()
  return useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.status === 401) logout(t('admin.sessionEnded'))
      return err instanceof Error ? err.message : t('admin.unexpected')
    },
    [logout, t],
  )
}

function LoginForm() {
  const { t } = useI18n()
  const { login, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="grid min-h-[60vh] place-items-center">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-lg border border-line bg-surface p-6">
        <div>
          <span className="inline-grid size-10 place-items-center rounded-md border border-line bg-raised text-fg">
            <IconShield className="size-5" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('admin.loginTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('admin.loginLead')}</p>
        </div>
        {notice && <p className="rounded-md border border-warning-line bg-warning-bg p-3 text-sm text-warning-ink">{notice}</p>}
        <Field label={t('admin.email')}>
          <input type="email" required autoComplete="username" placeholder="correo@entidad.gov.co"
            value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </Field>
        <Field label={t('admin.password')}>
          <input type="password" required minLength={8} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        </Field>
        {error && <p role="alert" className="text-sm text-negative-ink">{error}</p>}
        <button disabled={busy} className={`${primaryButton} w-full py-2.5`}>
          {busy ? t('admin.verifying') : t('admin.signIn')}
        </button>
      </form>
    </div>
  )
}

/** Franja de indicadores: una sola tarjeta dividida, sin íconos decorativos. */
function KpiStrip({ stats }: { stats: DashboardStats }) {
  const { t, locale } = useI18n()
  const cells: { label: string; value: ReactNode; hint?: string }[] = [
    { label: t('admin.kpi.zones'), value: stats.zones },
    { label: t('admin.kpi.subscribers'), value: stats.active_subscribers },
    {
      label: t('admin.kpi.sms'),
      value: stats.sms_sent_24h,
      hint: stats.sms_failed_24h ? t('admin.kpi.failed', { count: stats.sms_failed_24h }) : t('admin.kpi.noFailures'),
    },
    {
      label: t('admin.kpi.lastEval'),
      value: stats.last_evaluation_at ? <RelativeTime iso={stats.last_evaluation_at} withoutPrefix /> : '—',
      hint: stats.last_evaluation_at ? formatDateTime(stats.last_evaluation_at, locale) : t('admin.kpi.never'),
    },
  ]
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-4">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`border-line p-5 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
        >
          <dt className="text-sm text-muted">{c.label}</dt>
          <dd className="num mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</dd>
          {c.hint && <dd className="mt-0.5 text-xs text-muted">{c.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}

function LevelDistribution({ stats }: { stats: DashboardStats }) {
  const translator = useI18n()
  const { t } = translator
  const total = Math.max(stats.zones, 1)
  return (
    <Card title={t('admin.byLevel')}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-active">
        {[...LEVEL_ORDER].reverse().map((lvl) => (
          <div key={lvl} className={RISK_LEVELS[lvl].stripe} style={{ width: `${(stats.zones_by_level[lvl] / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {[...LEVEL_ORDER].reverse().map((lvl) => (
          <li key={lvl} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted">
              <span className={`size-2 rounded-full ${RISK_LEVELS[lvl].stripe}`} />
              {levelLabel(translator, lvl)}
            </span>
            <strong className="num font-semibold">{stats.zones_by_level[lvl]}</strong>
          </li>
        ))}
      </ul>
      {stats.zones_by_level.SIN_EVALUAR > 0 && (
        <p className="mt-3 text-xs text-muted">{t('admin.unassessed', { count: stats.zones_by_level.SIN_EVALUAR })}</p>
      )}
    </Card>
  )
}

function UsersPanel({ token, me }: { token: string; me: UserAccount }) {
  const { t, locale } = useI18n()
  const handleError = useApiErrorHandler()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('OPERATOR')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setUsers(await adminService.users(token))
    } catch (err) {
      setMessage({ ok: false, text: handleError(err) })
    }
  }, [token, handleError])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 12) {
      setMessage({ ok: false, text: t('admin.passwordTooShort', { min: 12 }) })
      return
    }
    setBusy(true)
    try {
      const created = await adminService.createUser(token, { email, password, role })
      setMessage({ ok: true, text: t('admin.accountCreated', { email: created.email }) })
      setEmail('')
      setPassword('')
      await load()
    } catch (err) {
      setMessage({ ok: false, text: handleError(err) })
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (user: UserAccount) => {
    try {
      await adminService.setActive(token, user.id, !user.active)
      await load()
    } catch (err) {
      setMessage({ ok: false, text: handleError(err) })
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card title={t('admin.accountsTitle')} flush>
        <ul className="divide-y divide-rule">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className={`block truncate font-medium ${u.active ? '' : 'text-faint line-through'}`}>
                  {u.email} {u.id === me.id && <span className="text-xs font-normal text-muted">{t('admin.you')}</span>}
                </span>
                <span className="text-xs text-muted">
                  {t(roleKey(u.role))} · {t('admin.created', { date: formatDateTime(u.created_at, locale) })}
                </span>
              </span>
              {u.id !== me.id && (
                <button
                  onClick={() => void toggle(u)}
                  className={`rounded-md border border-control px-3 py-1.5 text-sm font-medium transition ${u.active ? 'text-negative-ink hover:bg-negative-bg' : 'text-positive-ink hover:bg-positive-bg'}`}
                >
                  {u.active ? t('admin.deactivate') : t('admin.activate')}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('admin.newAccount')}>
        <form onSubmit={create} className="grid gap-4">
          <Field label={t('admin.newEmailLabel')}>
            <input type="email" required placeholder="correo@entidad.gov.co"
              value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </Field>
          <Field label={t('admin.newPasswordLabel')}>
            <input type="password" required minLength={12} autoComplete="new-password" placeholder={t('admin.newPasswordPlaceholder')}
              value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          </Field>
          <Field label={t('admin.roleLabel')}>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={field}>
              <option value="OPERATOR">{t('admin.role.OPERATOR')}</option>
              <option value="ADMIN">{t('admin.role.ADMIN')}</option>
            </select>
          </Field>
          <button disabled={busy} className={`${primaryButton} justify-self-start`}>{t('admin.createAccount')}</button>
          {message && <Message ok={message.ok}>{message.text}</Message>}
        </form>
      </Card>
    </div>
  )
}

function Overview({ token, stats, alerts, onEvaluated }: {
  token: string
  stats: DashboardStats | null
  alerts: AlertRecord[]
  onEvaluated: () => Promise<void>
}) {
  const { t, locale } = useI18n()
  const handleError = useApiErrorHandler()
  const { data } = useSnapshot()
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const evaluate = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await adminService.evaluate(token))
      await onEvaluated()
    } catch (err) {
      setError(handleError(err))
    } finally {
      setBusy(false)
    }
  }

  const zoneName = (id: string) => data?.snapshot.items.find((i) => i.zone.id === id)?.zone.name ?? t('admin.zoneFallback')
  const failures = result ? Object.entries(result.failures) : []

  return (
    <div className="space-y-6">
      {stats ? <KpiStrip stats={stats} /> : <div className="h-28 animate-pulse rounded-lg border border-line bg-surface" aria-hidden />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title={t('admin.smsTitle')} flush>
          {alerts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">{t('admin.smsEmpty')}</p>
          ) : (
            <ul className="divide-y divide-rule text-sm">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="font-medium">{zoneName(a.zone_id)}</span>
                    <span className="block text-xs text-muted">
                      {formatDateTime(a.created_at, locale)} · {a.channel} ·{' '}
                      {a.status === 'SENT' ? t('admin.smsSent') : t('admin.smsFailed', { error: a.error ?? '' })}
                    </span>
                  </span>
                  {a.kind === 'ALL_CLEAR' ? (
                    <span className="rounded-full bg-positive-bg px-2.5 py-0.5 text-xs font-semibold text-positive-ink">
                      {t('admin.allClear')}
                    </span>
                  ) : (
                    <RiskBadge level={a.level} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={t('admin.evalTitle')} lead={t('admin.evalBody')}>
            <button onClick={() => void evaluate()} disabled={busy} className={primaryButton}>
              <IconRefresh className={`size-4 ${busy ? 'animate-spin' : ''}`} />
              {busy ? t('admin.evalRunning') : t('admin.evalRun')}
            </button>
            {busy && <p className="mt-2 text-xs text-muted">{t('admin.evalHint')}</p>}
            {error && <p role="alert" className="mt-3 text-sm text-negative-ink">{error}</p>}
            {result && (
              <p role="status" className="mt-3 text-sm">
                {t('admin.evalResult', { count: result.evaluated })}
                {failures.length > 0 &&
                  ` · ${t('admin.evalFailures', { list: failures.map(([z, r]) => `${z} (${r})`).join(', ') })}`}
              </p>
            )}
          </Card>
          {stats && <LevelDistribution stats={stats} />}
        </div>
      </div>
    </div>
  )
}

type TabId = 'resumen' | 'zonas' | 'cuentas' | 'herramientas' | 'bitacora' | 'cuenta'

const TABS: { id: TabId; label: MessageKey; adminOnly: boolean }[] = [
  { id: 'resumen', label: 'admin.tab.summary', adminOnly: false },
  { id: 'zonas', label: 'admin.tab.zones', adminOnly: true },
  { id: 'cuentas', label: 'admin.tab.accounts', adminOnly: true },
  { id: 'herramientas', label: 'admin.tab.tools', adminOnly: false },
  { id: 'bitacora', label: 'admin.tab.audit', adminOnly: true },
  { id: 'cuenta', label: 'admin.tab.account', adminOnly: false },
]

/**
 * Pestañas accesibles (patrón WAI-ARIA): flechas para moverse, Inicio/Fin para
 * los extremos. La pestaña activa queda en la URL (?seccion=) y sobrevive a recargar.
 */
function Tabs({ tabs, active, onSelect }: { tabs: typeof TABS; active: TabId; onSelect: (id: TabId) => void }) {
  const { t } = useI18n()
  const refs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === active)
    const target =
      e.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
        : e.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length]
          : e.key === 'Home' ? tabs[0]
            : e.key === 'End' ? tabs[tabs.length - 1]
              : undefined
    if (!target) return
    e.preventDefault()
    onSelect(target.id)
    refs.current[target.id]?.focus()
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={t('admin.sections')} className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { refs.current[tab.id] = el }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={onKeyDown}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition ${active === tab.id ? 'border-fg font-medium text-fg' : 'border-transparent text-muted hover:text-fg'}`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ token, me }: { token: string; me: UserAccount }) {
  const { t } = useI18n()
  const { logout } = useAuth()
  const handleError = useApiErrorHandler()
  const { refresh } = useSnapshot()
  const [params, setParams] = useSearchParams()
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tabs = TABS.filter((tab) => !tab.adminOnly || me.role === 'ADMIN')
  const requested = params.get('seccion') as TabId | null
  const active = tabs.find((tab) => tab.id === requested)?.id ?? 'resumen'
  const select = (id: TabId) => setParams(id === 'resumen' ? {} : { seccion: id }, { replace: true })

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([adminService.alerts(token), adminService.stats(token)])
      setAlerts(a)
      setStats(s)
    } catch (err) {
      setError(handleError(err))
    }
  }, [token, handleError])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t('admin.title')}</h1>
          <p className="mt-1 truncate text-sm text-muted">
            {me.email} · {t(roleKey(me.role))}
          </p>
        </div>
        <button onClick={() => logout()} className={secondaryButton}>{t('admin.signOut')}</button>
      </header>

      <Tabs tabs={tabs} active={active} onSelect={select} />
      {error && <p role="alert" className="text-sm text-negative-ink">{error}</p>}

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0} className="outline-none">
        {active === 'resumen' && (
          <Overview token={token} stats={stats} alerts={alerts} onEvaluated={async () => { await Promise.all([refresh(), load()]) }} />
        )}
        {active === 'zonas' && <ZonesPanel token={token} />}
        {active === 'cuentas' && <UsersPanel token={token} me={me} />}
        {active === 'herramientas' && (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ExportCsvPanel token={token} />
            {me.role === 'ADMIN' && <SmsTestPanel token={token} />}
          </div>
        )}
        {active === 'bitacora' && <AuditLogPanel token={token} />}
        {active === 'cuenta' && <ChangePasswordForm token={token} />}
      </div>
    </div>
  )
}

export function AdminPage() {
  const { t } = useI18n()
  const { session } = useAuth()
  useDocumentTitle(session ? t('admin.docPanel') : t('admin.docLogin'))
  return session ? <Dashboard token={session.token} me={session.user} /> : <LoginForm />
}
