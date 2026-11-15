import { useState } from 'react'
import type { ZoneRisk } from '../domain/types'
import { buildShareText } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

/**
 * Comparte la zona con el menú nativo del celular (Web Share API); si el
 * navegador no lo tiene, copia el texto al portapapeles.
 */
export function ShareButton({ item, compact = false }: { item: ZoneRisk; compact?: boolean }) {
  const translator = useI18n()
  const { t } = translator
  const [feedback, setFeedback] = useState<string | null>(null)

  const share = async () => {
    const url = `${window.location.origin}/zona/${item.zone.id}`
    const text = buildShareText(translator, item, url)
    try {
      if (navigator.share) {
        await navigator.share({ title: `AlertaSinRed · ${item.zone.name}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      setFeedback(t('share.copied'))
    } catch (error) {
      // Cerrar el menú de compartir no es un error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFeedback(t('share.failed'))
    }
  }

  return (
    <div className={compact ? 'relative' : ''}>
      <button
        type="button"
        onClick={() => void share()}
        className={`flex items-center justify-center gap-2 rounded-md border border-control bg-surface font-medium transition hover:bg-raised ${compact ? 'px-3.5 py-2 text-sm' : 'w-full px-4 py-2.5'}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={compact ? 'size-4' : 'size-5'}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {compact ? t('zone.share') : t('share.button')}
      </button>
      {feedback && (
        <p role="status" className={compact ? 'absolute right-0 top-full z-10 mt-2 w-64 rounded-md border border-line bg-surface p-3 text-sm text-muted' : 'mt-2 text-center text-sm text-muted'}>
          {feedback}
        </p>
      )}
    </div>
  )
}
