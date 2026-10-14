import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconBell, IconPhone, IconWifiOff } from '../components/icons'
import { formatDateTime } from '../domain/time'
import { useOutbox } from '../hooks/useOutbox'
import { useSnapshot } from '../hooks/useSnapshot'
import { ApiError } from '../infrastructure/http/ApiClient'
import type { StoredSubscription } from '../infrastructure/storage/database'
import { subscriptionService } from '../services'

type Feedback = { kind: 'ok' | 'queued' | 'error'; text: string } | null

const PHONE_PATTERN = /^(\+?57)?\s?3\d{2}\s?\d{3}\s?\d{4}$/

const FEEDBACK_STYLE = {
  ok: 'bg-green-50 text-green-900 border-green-200',
  queued: 'bg-amber-50 text-amber-900 border-amber-200',
  error: 'bg-red-50 text-red-900 border-red-200',
}

export function SubscribePage() {
  const { data } = useSnapshot()
  const [params] = useSearchParams()
  const { pending, mine, reload, lastMessage } = useOutbox()
  const [zoneId, setZoneId] = useState(params.get('zona') ?? '')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const zones = data?.snapshot.items.map((i) => i.zone) ?? []
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? 'Zona'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // Validación en el cliente = mejor experiencia. La validación que protege es la del servidor.
    if (!PHONE_PATTERN.test(phone.trim())) {
      setFeedback({ kind: 'error', text: 'Escriba un celular colombiano válido, p. ej. 300 123 4567.' })
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
            : `Ese número ya estaba suscrito a esta zona (${outcome.response.phone_masked}).`,
        })
      } else {
        setFeedback({
          kind: 'queued',
          text: 'Está sin conexión. Guardamos su solicitud y se enviará sola cuando vuelva la señal.',
        })
      }
      setPhone('')
      await reload()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof ApiError ? err.message : 'No se pudo registrar.' })
    } finally {
      setSending(false)
    }
  }

  const cancel = async (subscription: StoredSubscription) => {
    const name = zoneName(subscription.zoneId)
    if (!window.confirm(`¿Dejar de recibir alertas SMS de "${name}" en ${subscription.phoneMasked}?`)) return
    setCancelling(subscription.id)
    try {
      const outcome = await subscriptionService.cancel(subscription)
      setFeedback(
        outcome === 'cancelled'
          ? { kind: 'ok', text: `Listo: ya no recibirá alertas de ${name}.` }
          : { kind: 'queued', text: 'Sin conexión: la baja se enviará cuando vuelva la señal.' },
      )
      await reload()
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : 'No se pudo dar de baja.' })
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-linear-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
        <span className="inline-grid size-11 place-items-center rounded-2xl bg-white/10">
          <IconBell className="size-6" />
        </span>
        <h1 className="mt-3 text-2xl font-bold">Alertas por SMS</h1>
        <p className="mt-1 text-slate-300">
          Si el riesgo de su zona sube a <strong className="text-white">alto</strong> o{' '}
          <strong className="text-white">muy alto</strong>, le enviamos un mensaje de texto. El SMS
          no necesita datos ni internet: llega con solo tener señal de celular.
        </p>
      </header>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold">Zona</span>
          <select
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
          >
            <option value="" disabled>Seleccione su zona…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Celular</span>
          <span className="relative mt-1 block">
            <IconPhone className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={20}
              required
              placeholder="300 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3"
            />
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            Autorizo el tratamiento de mi número celular con el único fin de recibir alertas de
            riesgo, conforme a la Ley 1581 de 2012. El número se almacena cifrado y puedo darme de
            baja cuando quiera desde este dispositivo.
          </span>
        </label>

        <button
          type="submit"
          disabled={sending || !zoneId || !consent}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Suscribirme'}
        </button>

        {feedback && (
          <p role="alert" className={`rounded-xl border p-3 text-sm ${FEEDBACK_STYLE[feedback.kind]}`}>
            {feedback.text}
          </p>
        )}
      </form>

      <section aria-labelledby="mis-suscripciones" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="mis-suscripciones" className="font-bold">Mis suscripciones en este dispositivo</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay suscripciones hechas desde este celular.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {mine.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block font-medium">{zoneName(s.zoneId)}</span>
                  <span className="block text-xs text-slate-500">
                    {s.phoneMasked} · desde {formatDateTime(s.createdAt)}
                  </span>
                </span>
                {s.cancelPending ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Baja pendiente de envío
                  </span>
                ) : (
                  <button
                    onClick={() => void cancel(s)}
                    disabled={cancelling === s.id}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling === s.id ? 'Procesando…' : 'Dar de baja'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Por seguridad, solo puede darse de baja desde el dispositivo con el que se suscribió.
        </p>
      </section>

      {(pending.length > 0 || lastMessage) && (
        <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5">
          <h2 className="flex items-center gap-2 font-bold text-amber-900">
            <IconWifiOff className="size-5" /> Pendientes de envío ({pending.length})
          </h2>
          {lastMessage && <p className="mt-1 text-sm text-green-800">{lastMessage}</p>}
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {pending.map((p) => (
              <li key={p.id}>
                {p.kind === 'subscription'
                  ? `Suscripción a ${zoneName(p.payload.zone_id)}`
                  : 'Baja de una suscripción'}{' '}
                · guardado {formatDateTime(p.createdAt)}
                {p.attempts > 0 && ` · ${p.attempts} intento(s)`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
