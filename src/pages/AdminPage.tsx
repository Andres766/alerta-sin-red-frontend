import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { IconRefresh, IconShield, IconSparkles, IconUsers } from '../components/icons'
import { ChangePasswordForm } from '../components/admin/ChangePasswordForm'
import { AuditLogPanel, ExportCsvButton, SmsTestPanel } from '../components/admin/OperationsTools'
import { ZonesPanel } from '../components/admin/ZonesPanel'
import { RelativeTime } from '../components/RelativeTime'
import { RiskBadge } from '../components/RiskBadge'
import { LEVEL_ORDER, RISK_LEVELS } from '../domain/riskLevel'
import { formatDateTime } from '../domain/time'
import type { AlertRecord, DashboardStats, EvaluationResult, Role, UserAccount } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useSnapshot } from '../hooks/useSnapshot'
import { ApiError } from '../infrastructure/http/ApiClient'
import { adminService } from '../services'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrador', OPERATOR: 'Operador' }

/** Un 401 significa token vencido o cuenta desactivada: se cierra la sesión. */
function useApiErrorHandler() {
  const { logout } = useAuth()
  return useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.status === 401) {
        logout('Su sesión terminó (expiró o la cuenta fue desactivada). Ingrese de nuevo.')
      }
      return err instanceof Error ? err.message : 'Error inesperado'
    },
    [logout],
  )
}

function LoginForm() {
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
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Demasiados intentos. Espere unos minutos.'
          : 'Credenciales inválidas.',
      )
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-lg border border-line bg-surface p-6">
      <span className="inline-grid size-12 place-items-center rounded-lg bg-primary text-on-primary">
        <IconShield className="size-6" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Acceso de operadores</h1>
        <p className="text-sm text-muted">Solo personal de gestión del riesgo municipal.</p>
      </div>
      {notice && <p className="rounded-md bg-warning-bg p-3 text-sm text-warning-ink">{notice}</p>}
      <label className="block">
        <span className="text-sm font-semibold">Correo</span>
        <input
          type="email" required autoComplete="username" placeholder="correo@entidad.gov.co"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-control px-3 py-3"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Contraseña</span>
        <input
          type="password" required minLength={8} autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-control px-3 py-3"
        />
      </label>
      {error && <p role="alert" className="text-sm text-negative-ink">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-primary py-3 font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60">
        {busy ? 'Verificando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function LevelDistribution({ stats }: { stats: DashboardStats }) {
  const total = Math.max(stats.zones, 1)
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">Zonas por nivel de riesgo</p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-raised">
        {[...LEVEL_ORDER].reverse().map((lvl) => (
          <div key={lvl} className={RISK_LEVELS[lvl].stripe} style={{ width: `${(stats.zones_by_level[lvl] / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {[...LEVEL_ORDER].reverse().map((lvl) => (
          <li key={lvl} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${RISK_LEVELS[lvl].stripe}`} />
            {RISK_LEVELS[lvl].label}: <strong>{stats.zones_by_level[lvl]}</strong>
          </li>
        ))}
        {stats.zones_by_level.SIN_EVALUAR > 0 && (
          <li className="text-muted">Sin evaluar: {stats.zones_by_level.SIN_EVALUAR}</li>
        )}
      </ul>
    </div>
  )
}

function UsersPanel({ token, me }: { token: string; me: UserAccount }) {
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
      setMessage({ ok: false, text: 'La contraseña debe tener al menos 12 caracteres.' })
      return
    }
    setBusy(true)
    try {
      const created = await adminService.createUser(token, { email, password, role })
      setMessage({ ok: true, text: `Cuenta creada: ${created.email}` })
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
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <IconUsers className="size-5 text-muted" /> Cuentas de operadores
      </h2>
      <ul className="mt-3 divide-y divide-rule">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="min-w-0">
              <span className={`block truncate font-medium ${u.active ? '' : 'text-faint line-through'}`}>
                {u.email} {u.id === me.id && <span className="text-xs font-normal text-muted">(usted)</span>}
              </span>
              <span className="text-xs text-muted">
                {ROLE_LABEL[u.role]} · creada {formatDateTime(u.created_at)}
              </span>
            </span>
            {u.id !== me.id && (
              <button
                onClick={() => void toggle(u)}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition ${u.active ? 'border-negative-ink/30 text-negative-ink hover:bg-negative-bg' : 'border-positive-ink/30 text-positive-ink hover:bg-positive-bg'}`}
              >
                {u.active ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="mt-4 grid gap-2 rounded-md bg-raised p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <input
          type="email" required placeholder="correo@entidad.gov.co" aria-label="Correo de la nueva cuenta"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-control px-3 py-2.5"
        />
        <input
          type="password" required minLength={12} autoComplete="new-password"
          placeholder="Contraseña (mín. 12)" aria-label="Contraseña de la nueva cuenta"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-control px-3 py-2.5"
        />
        <select
          aria-label="Rol" value={role} onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-md border border-control bg-surface px-3 py-2.5"
        >
          <option value="OPERATOR">Operador</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <button disabled={busy} className="whitespace-nowrap rounded-md bg-primary px-4 py-2.5 font-semibold text-on-primary disabled:opacity-60">
          Crear cuenta
        </button>
      </form>
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? 'text-positive-ink' : 'text-negative-ink'}`}>{message.text}</p>
      )}
    </section>
  )
}

function Dashboard({ token, me }: { token: string; me: UserAccount }) {
  const { logout } = useAuth()
  const handleError = useApiErrorHandler()
  const { data, refresh } = useSnapshot()
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const evaluate = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await adminService.evaluate(token))
      await Promise.all([refresh(), load()])
    } catch (err) {
      setError(handleError(err))
    } finally {
      setBusy(false)
    }
  }

  const zoneName = (id: string) => data?.snapshot.items.find((i) => i.zone.id === id)?.zone.name ?? 'Zona'

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-linear-to-br from-slate-800 to-slate-900 p-5 text-white">
        <div>
          <p className="text-sm text-slate-300">Panel del operador</p>
          <h1 className="text-xl font-bold">{me.email}</h1>
          <p className="text-xs text-faint">{ROLE_LABEL[me.role]}</p>
        </div>
        <button onClick={() => logout()} className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
          Cerrar sesión
        </button>
      </header>

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Zonas" value={stats.zones} />
            <StatTile label="Suscriptores SMS" value={stats.active_subscribers} />
            <StatTile label="SMS enviados (24 h)" value={stats.sms_sent_24h} hint={stats.sms_failed_24h ? `${stats.sms_failed_24h} fallidos` : 'sin fallos'} />
            <StatTile
              label="Última evaluación"
              value={stats.last_evaluation_at ? <RelativeTime iso={stats.last_evaluation_at} withoutPrefix /> : '—'}
              hint={stats.last_evaluation_at ? formatDateTime(stats.last_evaluation_at) : 'nunca'}
            />
          </div>
          <LevelDistribution stats={stats} />
        </>
      )}

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <IconSparkles className="size-5 text-muted" /> Evaluación con el modelo de IA
        </h2>
        <p className="mt-1 text-sm text-muted">
          Descarga lluvia, humedad del suelo y caudal de Open-Meteo para cada zona, ejecuta el
          clasificador y envía SMS a los suscriptores si el riesgo es alto. Se ejecuta también
          automáticamente cada hora.
        </p>
        <button
          onClick={() => void evaluate()}
          disabled={busy}
          className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          <IconRefresh className={`size-5 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Evaluando zonas…' : 'Ejecutar evaluación ahora'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-negative-ink">{error}</p>}
        {result && (
          <p className="mt-3 text-sm text-fg">
            {result.evaluated} zona(s) evaluada(s)
            {Object.keys(result.failures).length > 0 &&
              ` · fallos: ${Object.entries(result.failures).map(([z, r]) => `${z} (${r})`).join(', ')}`}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Últimos SMS</h2>
          <ExportCsvButton token={token} />
        </div>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no se han enviado alertas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{zoneName(a.zone_id)}</span>
                  <span className="block text-xs text-muted">
                    {formatDateTime(a.created_at)} · {a.channel} ·{' '}
                    {a.status === 'SENT' ? 'enviado' : `falló (${a.error})`}
                  </span>
                </span>
                {a.kind === 'ALL_CLEAR' ? (
                  <span className="rounded-full bg-positive-bg px-2.5 py-0.5 text-xs font-semibold text-positive-ink">
                    Fin de alerta
                  </span>
                ) : (
                  <RiskBadge level={a.level} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {me.role === 'ADMIN' && <UsersPanel token={token} me={me} />}
      {me.role === 'ADMIN' && <ZonesPanel token={token} />}
      {me.role === 'ADMIN' && <SmsTestPanel token={token} />}
      {me.role === 'ADMIN' && <AuditLogPanel token={token} />}

      <ChangePasswordForm token={token} />
    </div>
  )
}

export function AdminPage() {
  const { session } = useAuth()
  useDocumentTitle(session ? 'Panel del operador' : 'Acceso de operadores')
  return session ? <Dashboard token={session.token} me={session.user} /> : <LoginForm />
}
