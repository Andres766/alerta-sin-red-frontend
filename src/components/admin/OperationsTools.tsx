import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { formatColombianMobile, isValidColombianMobile } from '../../domain/phone'
import { formatDateTime } from '../../domain/time'
import type { AuditEntry } from '../../domain/types'
import { ApiError } from '../../infrastructure/http/ApiClient'
import { adminService } from '../../services'

const ACTION_LABEL: Record<string, string> = {
  LOGIN_SUCCEEDED: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio de sesión fallido',
  PASSWORD_CHANGED: 'Cambio de contraseña',
  USER_CREATED: 'Cuenta creada',
  USER_ACTIVATED: 'Cuenta activada',
  USER_DEACTIVATED: 'Cuenta desactivada',
  EVALUATION_RUN: 'Evaluación ejecutada',
  ZONE_CREATED: 'Zona registrada',
  ZONE_UPDATED: 'Zona actualizada',
  SMS_TEST_SENT: 'SMS de prueba',
}

/** Exporta el historial de evaluaciones para informes (cualquier operador). */
export function ExportCsvButton({ token }: { token: string }) {
  const [days, setDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setError(null)
    try {
      const blob = await adminService.assessmentsCsv(token, days)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `evaluaciones-ultimos-${days}-dias.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-muted">
        Últimos{' '}
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-control bg-surface px-2 py-1.5">
          {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>{' '}
        días
      </label>
      <button type="button" onClick={() => void download()}
        className="rounded-md border border-control bg-surface px-3 py-2 text-sm font-semibold hover:bg-raised">
        Exportar evaluaciones (CSV)
      </button>
      {error && <p role="alert" className="w-full text-sm text-negative-ink">{error}</p>}
    </div>
  )
}

/** Verifica la pasarela SMS antes de una emergencia (solo administradores, máx. 5 por hora). */
export function SmsTestPanel({ token }: { token: string }) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidColombianMobile(phone)) {
      setResult({ ok: false, text: 'Escriba un celular colombiano válido.' })
      return
    }
    setBusy(true)
    try {
      const r = await adminService.sendTestSms(token, phone)
      setResult(r.success
        ? { ok: true, text: `Enviado a ${r.phone_masked} por ${r.channel}.` }
        : { ok: false, text: `La pasarela (${r.channel}) falló: ${r.error ?? 'sin detalle'}` })
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof ApiError && err.status === 429
          ? 'Límite alcanzado: máximo 5 SMS de prueba por hora.'
          : err instanceof Error ? err.message : 'No se pudo enviar',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="font-bold">SMS de prueba</h2>
      <p className="mt-1 text-sm text-muted">
        Compruebe que la pasarela SMS funciona antes de una emergencia real.
      </p>
      <form onSubmit={send} className="mt-3 flex flex-wrap gap-2">
        <input type="tel" inputMode="tel" placeholder="300 123 4567" aria-label="Celular para la prueba"
          value={phone} onChange={(e) => setPhone(formatColombianMobile(e.target.value))}
          className="rounded-md border border-control px-3 py-2.5" />
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2.5 font-semibold text-on-primary disabled:opacity-60">
          {busy ? 'Enviando…' : 'Enviar prueba'}
        </button>
      </form>
      {result && (
        <p role="status" className={`mt-2 text-sm ${result.ok ? 'text-positive-ink' : 'text-negative-ink'}`}>{result.text}</p>
      )}
    </section>
  )
}

/** Bitácora de acciones sensibles (solo administradores). */
export function AuditLogPanel({ token }: { token: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setEntries(await adminService.auditLog(token))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la bitácora')
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Bitácora de auditoría</h2>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold text-muted underline">
          Actualizar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-negative-ink">{error}</p>}
      {entries && entries.length === 0 && <p className="mt-2 text-sm text-muted">Sin registros todavía.</p>}
      {entries && entries.length > 0 && (
        <ul className="mt-3 max-h-80 divide-y divide-rule overflow-y-auto text-sm">
          {entries.map((e) => (
            <li key={e.id} className="py-2">
              <span className={`font-medium ${e.action === 'LOGIN_FAILED' ? 'text-negative-ink' : ''}`}>
                {ACTION_LABEL[e.action] ?? e.action}
              </span>
              {e.target && <span className="text-fg"> · {e.target}</span>}
              <span className="block text-xs text-muted">
                {formatDateTime(e.created_at)} · {e.actor}{e.details && ` · ${e.details}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
