import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RiskBadge } from '../components/RiskBadge'
import { formatDateTime } from '../domain/time'
import type { AlertRecord, EvaluationResult } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useSnapshot } from '../hooks/useSnapshot'
import { ApiError } from '../infrastructure/http/ApiClient'
import { adminService } from '../services'

function LoginForm() {
  const { login } = useAuth()
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
          ? 'Demasiados intentos. Espere un minuto.'
          : 'Credenciales inválidas.',
      )
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">Acceso de operadores</h1>
      <p className="text-sm text-slate-600">Solo personal de gestión del riesgo municipal.</p>
      <input
        type="email" required autoComplete="username" placeholder="correo@entidad.gov.co"
        value={email} onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      <input
        type="password" required minLength={8} autoComplete="current-password" placeholder="Contraseña"
        value={password} onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
      />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-slate-900 py-2.5 font-semibold text-white disabled:opacity-60">
        {busy ? 'Verificando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function Dashboard({ token }: { token: string }) {
  const { logout } = useAuth()
  const { data, refresh } = useSnapshot()
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [stats, setStats] = useState<{ active_subscribers: number; zones: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) logout()
    setError(err instanceof Error ? err.message : 'Error')
  }, [logout])

  const loadAlerts = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([adminService.alerts(token), adminService.stats(token)])
      setAlerts(a)
      setStats(s)
    } catch (err) {
      handleError(err)
    }
  }, [token, handleError])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  const evaluate = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await adminService.evaluate(token))
      await Promise.all([refresh(), loadAlerts()])
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  const zoneName = (id: string) => data?.snapshot.items.find((i) => i.zone.id === id)?.zone.name ?? id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Panel del operador</h1>
        <button onClick={logout} className="text-sm text-slate-600 underline">Cerrar sesión</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Zonas monitoreadas</p>
            <p className="text-3xl font-bold tabular-nums">{stats.zones}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Suscriptores SMS activos</p>
            <p className="text-3xl font-bold tabular-nums">{stats.active_subscribers}</p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Evaluación con el modelo de IA</h2>
        <p className="mt-1 text-sm text-slate-600">
          Descarga lluvia, humedad del suelo y caudal de Open-Meteo para cada zona, ejecuta el
          clasificador y envía SMS a los suscriptores si el riesgo es alto.
        </p>
        <button
          onClick={() => void evaluate()}
          disabled={busy}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Evaluando zonas…' : 'Ejecutar evaluación ahora'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {result && (
          <div className="mt-4 text-sm">
            <p>
              {result.evaluated} zona(s) evaluada(s)
              {Object.keys(result.failures).length > 0 &&
                ` · fallos: ${Object.entries(result.failures).map(([z, r]) => `${z} (${r})`).join(', ')}`}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Últimos SMS enviados</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Todavía no se han enviado alertas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{zoneName(a.zone_id)}</span>
                  <span className="block text-xs text-slate-500">
                    {formatDateTime(a.created_at)} · {a.channel} ·{' '}
                    {a.status === 'SENT' ? 'enviado' : `falló (${a.error})`}
                  </span>
                </span>
                <RiskBadge level={a.level} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function AdminPage() {
  const { session } = useAuth()
  return session ? <Dashboard token={session.token} /> : <LoginForm />
}
