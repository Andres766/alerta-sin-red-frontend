import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { formatColombianMobile, isValidColombianMobile } from '../../domain/phone'
import { formatDateTime } from '../../domain/time'
import type { AuditEntry } from '../../domain/types'
import { es, type MessageKey } from '../../i18n/es'
import { useI18n } from '../../i18n/I18nProvider'
import { ApiError } from '../../infrastructure/http/ApiClient'
import { adminService } from '../../services'
import { IconRefresh } from '../icons'
import { Card, Field, field, Message, primaryButton, secondaryButton } from './ui'

/** Exporta el historial de evaluaciones para informes (cualquier operador). */
export function ExportCsvPanel({ token }: { token: string }) {
  const { t } = useI18n()
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
      setError(err instanceof Error ? err.message : t('tools.exportFailed'))
    }
  }

  return (
    <Card title={t('tools.exportTitle')} lead={t('tools.exportLead')}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('tools.period')} className="w-48">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={field}>
            {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{t('tools.lastDays', { days: d })}</option>)}
          </select>
        </Field>
        <button type="button" onClick={() => void download()} className={secondaryButton}>
          {t('tools.export')}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-negative-ink">{error}</p>}
    </Card>
  )
}

/** Verifica la pasarela SMS antes de una emergencia (solo administradores, máx. 5 por hora). */
export function SmsTestPanel({ token }: { token: string }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValidColombianMobile(phone)) {
      setResult({ ok: false, text: t('tools.smsInvalid') })
      return
    }
    setBusy(true)
    try {
      const r = await adminService.sendTestSms(token, phone)
      setResult(r.success
        ? { ok: true, text: t('tools.smsSent', { phone: r.phone_masked, channel: r.channel }) }
        : { ok: false, text: t('tools.smsGatewayFailed', { channel: r.channel, error: r.error ?? t('tools.noDetail') }) })
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof ApiError && err.status === 429
          ? t('tools.smsLimit')
          : err instanceof Error ? err.message : t('tools.smsFailed'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={t('tools.smsTitle')} lead={t('tools.smsLead')}>
      <form onSubmit={send} className="flex flex-wrap items-end gap-3">
        <Field label={t('tools.smsPhone')} className="w-56">
          <input type="tel" inputMode="tel" placeholder="300 123 4567"
            value={phone} onChange={(e) => setPhone(formatColombianMobile(e.target.value))} className={field} />
        </Field>
        <button disabled={busy} className={primaryButton}>{busy ? t('tools.sending') : t('tools.send')}</button>
      </form>
      {result && <div className="mt-3"><Message ok={result.ok}>{result.text}</Message></div>}
    </Card>
  )
}

function actionLabel(t: (key: MessageKey) => string, action: string): string {
  const key = `audit.${action}`
  return key in es ? t(key as MessageKey) : action
}

/** Bitácora de acciones sensibles (solo administradores). */
export function AuditLogPanel({ token }: { token: string }) {
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setEntries(await adminService.auditLog(token))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('audit.loadFailed'))
    }
  }, [token, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card
      title={t('audit.title')}
      lead={t('audit.lead')}
      flush
      actions={
        <button type="button" onClick={() => void load()} className={secondaryButton}>
          <IconRefresh className="size-4" /> {t('common.update')}
        </button>
      }
    >
      {error && <p role="alert" className="px-5 py-4 text-sm text-negative-ink">{error}</p>}
      {entries && entries.length === 0 && <p className="px-5 py-4 text-sm text-muted">{t('audit.empty')}</p>}
      {entries && entries.length > 0 && (
        <div className="max-h-128 overflow-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="sticky top-0 bg-raised text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">{t('audit.colAction')}</th>
                <th scope="col" className="px-5 py-2 font-medium">{t('audit.colActor')}</th>
                <th scope="col" className="px-5 py-2 font-medium">{t('audit.colDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-2.5 align-top">
                    <span className={`font-medium ${e.action === 'LOGIN_FAILED' ? 'text-negative-ink' : ''}`}>
                      {actionLabel(t, e.action)}
                    </span>
                    {(e.target || e.details) && (
                      <span className="block text-xs text-muted">{[e.target, e.details].filter(Boolean).join(' · ')}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 align-top text-muted">{e.actor}</td>
                  <td className="num whitespace-nowrap px-5 py-2.5 align-top text-muted">{formatDateTime(e.created_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
