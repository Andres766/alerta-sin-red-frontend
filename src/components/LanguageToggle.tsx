import { useI18n } from '../i18n/I18nProvider'
import type { Language } from '../i18n/translator'

const OPTIONS: { lang: Language; short: string; name: string }[] = [
  { lang: 'es', short: 'ES', name: 'Español' },
  { lang: 'en', short: 'EN', name: 'English' },
]

/** Control segmentado ES / EN. Cada opción se anuncia en su propio idioma. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLanguage, t } = useI18n()
  return (
    <div role="radiogroup" aria-label={t('prefs.language')} className={`inline-flex rounded-md border border-line bg-raised p-0.5 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          role="radio"
          aria-checked={lang === o.lang}
          aria-label={o.name}
          lang={o.lang}
          title={o.name}
          onClick={() => setLanguage(o.lang)}
          className={`h-8 min-w-9 rounded-[5px] px-2 text-xs font-semibold transition ${lang === o.lang ? 'bg-surface text-fg ring-1 ring-line' : 'text-muted hover:text-fg'}`}
        >
          {o.short}
        </button>
      ))}
    </div>
  )
}
