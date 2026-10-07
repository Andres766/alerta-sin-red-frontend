import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatDateTime } from '../domain/time'
import { useOutbox } from '../hooks/useOutbox'
import { useSnapshot } from '../hooks/useSnapshot'
import { ApiError } from '../infrastructure/http/ApiClient'
import { subscriptionService } from '../services'

type Feedback = { kind: 'ok' | 'queued' | 'error'; text: string } | null

const PHONE_PATTERN = /^(\+?57)?\s?3\d{2}\s?\d{3}\s?\d{4}$/

export function SubscribePage() {
  const { data } = useSnapshot()
  const [params] = useSearchParams()
  const { pending, reload, lastMessage } = useOutbox()
  const [zoneId, setZoneId] = useState(params.get('zona') ?? '')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

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
        setFeedback({ kind: 'ok', text: `${outcome.response.message} (${outcome.response.phone_masked})` })
      } else {
        setFeedback({
          kind: 'queued',
          text: 'Estás sin conexión. Guardamos tu solicitud y se enviará automáticamente cuando vuelva la señal.',
        })
        await reload()
      }
      setPhone('')
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof ApiError ? err.message : 'No se pudo registrar.' })
    } finally {
      setSending(false)
    }
  }

  const feedbackStyle = {
    ok: 'bg-green-50 text-green-900 border-green-200',
    queued: 'bg-amber-50 text-amber-900 border-amber-200',
    error: 'bg-red-50 text-red-900 border-red-200',
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Alertas por SMS</h1>
        <p className="mt-1 text-slate-600">
          Si el riesgo de tu zona sube a <strong>alto</strong> o <strong>muy alto</strong>, te
          enviamos un mensaje de texto. El SMS no necesita datos móviles ni internet: llega con
          solo tener señal de celular.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" noValidate>
        <label className="block">
          <span className="text-sm font-medium">Zona</span>
          <select
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
          >
            <option value="" disabled>Seleccione su zona…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Celular</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={20}
            required
            placeholder="300 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
          />
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            Autorizo el tratamiento de mi número celular con el único fin de recibir alertas de
            riesgo, conforme a la Ley 1581 de 2012. El número se almacena cifrado.
          </span>
        </label>

        <button
          type="submit"
          disabled={sending || !zoneId || !consent}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Suscribirme'}
        </button>

        {feedback && (
          <p role="alert" className={`rounded-xl border p-3 text-sm ${feedbackStyle[feedback.kind]}`}>
            {feedback.text}
          </p>
        )}
      </form>

      {(pending.length > 0 || lastMessage) && (
        <section className="rounded-2xl border border-dashed border-slate-300 p-5">
          <h2 className="font-semibold">Pendientes de envío ({pending.length})</h2>
          {lastMessage && <p className="mt-1 text-sm text-green-800">{lastMessage}</p>}
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {pending.map((p) => (
              <li key={p.id}>
                {zoneName(p.payload.zone_id)} · guardado {formatDateTime(p.createdAt)}
                {p.attempts > 0 && ` · ${p.attempts} intento(s)`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
