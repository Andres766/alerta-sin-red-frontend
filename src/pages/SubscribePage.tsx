import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconBell, IconPhone, IconShield, IconWifiOff } from '../components/icons'
import { formatColombianMobile, isValidColombianMobile } from '../domain/phone'
import { formatDateTime } from '../domain/time'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useOutbox } from '../hooks/useOutbox'
import { useSnapshot } from '../hooks/useSnapshot'
import { useI18n } from '../i18n/I18nProvider'
import { ApiError } from '../infrastructure/http/ApiClient'
import type { StoredSubscription } from '../infrastructure/storage/database'
import { subscriptionService } from '../services'

type Feedback = { kind: 'ok' | 'queued' | 'error'; text: string } | null

const FEEDBACK_STYLE = {
  ok: 'bg-positive-bg text-positive-ink border-positive-ink/30',
  queued: 'bg-warning-bg text-warning-ink border-warning-line',
  error: 'bg-negative-bg text-negative-ink border-negative-ink/30',
}

const field = 'mt-1.5 w-full rounded-md border border-control bg-surface px-3 py-2.5'

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="text-sm">
        <span className="block font-medium">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  )
}

export function SubscribePage() {
  const { t, locale } = useI18n()
  const { data } = useSnapshot()
  const [params] = useSearchParams()
  const { pending, mine, reload, lastMessage } = useOutbox()
  const [zoneId, setZoneId] = useState(params.get('zona') ?? '')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  useDocumentTitle(t('sub.docTitle'))

  const zones = data?.snapshot.items.map((i) => i.zone) ?? []
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? t('sub.zoneFallback')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // Validación en el cliente = mejor experiencia. La validación que protege es la del servidor.
    if (!isValidColombianMobile(phone)) {
      setFeedback({ kind: 'error', text: t('sub.invalidPhone') })
      return
    }
    setSending(true)
    setFeedback(null)
    try {
      const outcome = await subscriptionService.subscribe({
        phone: phone.trim(),
        zone_id: zoneId,
        accepts_data_policy: consent,
      })
      if (outcome.status === 'sent') {
        setFeedback({
          kind: 'ok',
          text: outcome.response.cancel_token
            ? `${outcome.response.message} (${outcome.response.phone_masked})`
            : t('sub.already', { phone: outcome.response.phone_masked }),
        })
      } else {
        setFeedback({ kind: 'queued', text: t('sub.queued') })
      }
      setPhone('')
      await reload()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof ApiError ? err.message : t('sub.failed') })
    } finally {
      setSending(false)
    }
  }

  const cancel = async (subscription: StoredSubscription) => {
    const name = zoneName(subscription.zoneId)
    if (!window.confirm(t('sub.confirmCancel', { zone: name, phone: subscription.phoneMasked }))) return
    setCancelling(subscription.id)
    try {
      const outcome = await subscriptionService.cancel(subscription)
      setFeedback(
        outcome === 'cancelled'
          ? { kind: 'ok', text: t('sub.cancelled', { zone: name }) }
          : { kind: 'queued', text: t('sub.cancelQueued') },
      )
      await reload()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : t('sub.cancelFailed') })
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{t('sub.title')}</h1>
        <p className="mt-1.5 text-muted">{t('sub.lead')}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Formulario */}
        <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-3.5 text-base font-semibold">{t('sub.formTitle')}</h2>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('sub.zone')}</span>
                <select required value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={field}>
                  <option value="" disabled>{t('sub.zonePlaceholder')}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">{t('sub.phone')}</span>
                <span className="relative block">
                  <IconPhone className="pointer-events-none absolute left-3 top-1/2 mt-0.75 size-4 -translate-y-1/2 text-faint" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    maxLength={20}
                    required
                    placeholder="300 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(formatColombianMobile(e.target.value))}
                    className={`${field} pl-9`}
                  />
                </span>
                <span className="mt-1 block text-xs text-muted">{t('sub.phoneHint')}</span>
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-line bg-raised p-3.5 text-sm">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-current"
              />
              <span>{t('sub.consent')}</span>
            </label>

            {feedback && (
              <p role="alert" className={`rounded-md border p-3 text-sm ${FEEDBACK_STYLE[feedback.kind]}`}>
                {feedback.text}
              </p>
            )}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3.5">
            <button
              type="submit"
              disabled={sending || !zoneId || !consent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              <IconBell className="size-4" />
              {sending ? t('sub.sending') : t('sub.submit')}
            </button>
          </div>
        </form>

        {/* Columna derecha: suscripciones de este dispositivo y qué esperar */}
        <div className="space-y-6">
          <section aria-labelledby="mis-suscripciones" className="rounded-lg border border-line bg-surface">
            <h2 id="mis-suscripciones" className="border-b border-line px-4 py-3.5 text-base font-semibold">
              {t('sub.mine')}
            </h2>
            {mine.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">{t('sub.mineEmpty')}</p>
            ) : (
              <ul className="divide-y divide-rule">
                {mine.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{zoneName(s.zoneId)}</span>
                      <span className="block text-xs text-muted">
                        {s.phoneMasked} · {t('sub.since', { date: formatDateTime(s.createdAt, locale) })}
                      </span>
                    </span>
                    {s.cancelPending ? (
                      <span className="rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning-ink">
                        {t('sub.cancelPending')}
                      </span>
                    ) : (
                      <button
                        onClick={() => void cancel(s)}
                        disabled={cancelling === s.id}
                        className="rounded-md border border-control px-3 py-1.5 text-sm font-medium text-negative-ink transition hover:bg-negative-bg disabled:opacity-50"
                      >
                        {cancelling === s.id ? t('sub.processing') : t('sub.cancel')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-line px-4 py-3 text-xs text-muted">{t('sub.cancelNote')}</p>
          </section>

          {(pending.length > 0 || lastMessage) && (
            <section className="rounded-lg border border-warning-line bg-warning-bg p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-warning-ink">
                <IconWifiOff className="size-4" /> {t('sub.pending', { count: pending.length })}
              </h2>
              {lastMessage && <p className="mt-1 text-sm text-positive-ink">{lastMessage}</p>}
              <ul className="mt-2 space-y-1 text-sm text-warning-ink">
                {pending.map((p) => (
                  <li key={p.id}>
                    {p.kind === 'subscription'
                      ? t('sub.pendingSub', { zone: zoneName(p.payload.zone_id) })
                      : t('sub.pendingCancel')}
                    {' · '}
                    {t('sub.savedAt', { date: formatDateTime(p.createdAt, locale) })}
                    {p.attempts > 0 && ` · ${t('sub.attempts', { count: p.attempts })}`}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="que-esperar" className="rounded-lg border border-line bg-surface">
            <h2 id="que-esperar" className="border-b border-line px-4 py-3.5 text-base font-semibold">
              {t('sub.factsTitle')}
            </h2>
            <ul className="divide-y divide-rule">
              <Fact icon={<IconBell className="size-4" />} title={t('sub.fact1Title')}>{t('sub.fact1')}</Fact>
              <Fact icon={<IconWifiOff className="size-4" />} title={t('sub.fact2Title')}>{t('sub.fact2')}</Fact>
              <Fact icon={<IconShield className="size-4" />} title={t('sub.fact3Title')}>{t('sub.fact3')}</Fact>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
