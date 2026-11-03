import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBell, IconSparkles, IconWifiOff } from '../components/icons'
import { FEATURE_LABEL } from '../domain/riskLevel'
import { formatDateTime } from '../domain/time'
import type { ModelCard } from '../domain/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { modelInfoService } from '../services'

const percent = (value: number | undefined) =>
  value === undefined ? '—' : `${Math.round(value * 100)} %`

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700">{icon}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-slate-700">{children}</div>
    </section>
  )
}

export function HowItWorksPage() {
  useDocumentTitle('Cómo funciona')
  const [card, setCard] = useState<ModelCard | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    modelInfoService
      .card()
      .then(setCard)
      .catch(() => setError(true))
  }, [])

  const importances = card
    ? Object.entries(card.feature_importances).sort(([, a], [, b]) => b - a)
    : []
  const maxImportance = importances[0]?.[1] ?? 1

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-linear-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Cómo funciona AlertaSinRed</h1>
        <p className="mt-1 text-slate-300">
          Alertas de riesgo de deslizamiento y creciente de ríos que siguen disponibles cuando
          no hay internet, justo cuando más se necesitan.
        </p>
      </header>

      <Step icon={<IconSparkles className="size-5" />} title="1. Un modelo de inteligencia artificial estima el riesgo">
        <p>
          Cada hora el servidor descarga, para cada zona, la lluvia de las últimas 24 h, 72 h y
          7 días, el pronóstico de las próximas 24 h, la humedad del suelo y el caudal del río
          más cercano (Open-Meteo). Les suma dos datos fijos del terreno: la pendiente y la
          susceptibilidad a movimientos en masa (Servicio Geológico Colombiano).
        </p>
        <p>
          Con esas 8 variables, un modelo de clasificación (Random Forest) asigna uno de cuatro
          niveles: <strong>bajo, moderado, alto o muy alto</strong>, junto con la probabilidad
          de cada uno y los factores que más pesaron.
        </p>
      </Step>

      <Step icon={<IconWifiOff className="size-5" />} title="2. Funciona sin internet">
        <p>
          La primera vez que abre la app con conexión, el celular guarda la aplicación y el
          último estado de riesgo de todas las zonas. Si después se queda sin señal, la app
          sigue abriendo y le muestra esa información, avisándole de cuándo es.
        </p>
        <p>
          Lo que haga sin conexión (suscribirse o darse de baja) queda pendiente y se envía
          solo cuando vuelve la señal.
        </p>
      </Step>

      <Step icon={<IconBell className="size-5" />} title="3. SMS de respaldo">
        <p>
          Si el riesgo de su zona sube a alto o muy alto, le llega un mensaje de texto. El SMS
          no necesita datos ni internet: basta con señal de celular. Cuando el riesgo baja, le
          avisamos que la alerta terminó.
        </p>
        <Link to="/suscribirme" className="inline-block font-semibold text-slate-900 underline">
          Suscribirme a las alertas
        </Link>
      </Step>

      <section aria-labelledby="ficha" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="ficha" className="font-bold">Ficha técnica del modelo</h2>
        {error && (
          <p className="mt-2 text-sm text-slate-600">
            No se pudo cargar la ficha del modelo. Conéctese para verla.
          </p>
        )}
        {!card && !error && <div className="mt-3 h-32 animate-pulse rounded-xl bg-slate-100" aria-hidden />}
        {card && (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Exactitud', percent(card.metrics.test_accuracy)],
                ['F1 macro', percent(card.metrics.test_f1_macro)],
                ['Detecta "alto"', percent(card.metrics.recall_alto)],
                ['Detecta "muy alto"', percent(card.metrics.recall_muy_alto)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500">
              {card.algorithm} · versión {card.version} · entrenado {formatDateTime(card.trained_at)} con{' '}
              {card.n_samples.toLocaleString('es-CO')} ejemplos ({card.data_source})
            </p>

            <h3 className="mt-5 text-sm font-semibold text-slate-700">¿Qué variables pesan más?</h3>
            <ul className="mt-2 space-y-1.5">
              {importances.map(([name, value]) => (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 text-slate-600">{FEATURE_LABEL[name]?.label ?? name}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-slate-700" style={{ width: `${(value / maxImportance) * 100}%` }} />
                  </span>
                  <span className="w-10 text-right tabular-nums">{percent(value)}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-5 text-sm font-semibold text-slate-700">Limitaciones conocidas</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {card.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="text-center text-sm text-slate-600">
        Esta herramienta complementa, no reemplaza, los avisos oficiales de la UNGRD, el IDEAM y
        las alcaldías. En emergencia llame al <strong>123</strong>.
      </p>
    </div>
  )
}
