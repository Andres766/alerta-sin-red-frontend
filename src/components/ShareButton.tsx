import { useState } from 'react'
import { buildShareText } from '../domain/shareText'
import type { ZoneRisk } from '../domain/types'

/**
 * Comparte la zona con el menú nativo del celular (Web Share API); si el
 * navegador no lo tiene, copia el texto al portapapeles.
 */
export function ShareButton({ item }: { item: ZoneRisk }) {
  const [feedback, setFeedback] = useState<string | null>(null)

  const share = async () => {
    const url = `${window.location.origin}/zona/${item.zone.id}`
    const text = buildShareText(item, url)
    try {
      if (navigator.share) {
        await navigator.share({ title: `AlertaSinRed · ${item.zone.name}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      setFeedback('Texto copiado: péguelo en WhatsApp o en un mensaje.')
    } catch (error) {
      // Cerrar el menú de compartir no es un error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFeedback('No se pudo compartir en este dispositivo.')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void share()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold transition hover:bg-slate-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Compartir esta alerta
      </button>
      {feedback && (
        <p role="status" className="mt-2 text-center text-sm text-slate-600">
          {feedback}
        </p>
      )}
    </div>
  )
}
