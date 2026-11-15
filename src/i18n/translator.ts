import { en } from './en'
import { es, type MessageKey, type Messages } from './es'

export type Language = 'es' | 'en'
export type Params = Record<string, string | number>
export type Translate = (key: MessageKey, params?: Params) => string

const DICTIONARIES: Record<Language, Messages> = { es, en }
const LOCALES: Record<Language, string> = { es: 'es-CO', en: 'en-US' }

export interface Translator {
  lang: Language
  /** Locale para Intl (fechas, números, tiempo relativo). */
  locale: string
  t: Translate
  /** Formatea números con la convención del idioma (1.234,5 frente a 1,234.5). */
  number: (value: number, maximumFractionDigits?: number) => string
}

/** Crea un traductor puro: lo usan la página, el Service Worker y las pruebas. */
export function createTranslator(lang: Language): Translator {
  const dictionary = DICTIONARIES[lang]
  const locale = LOCALES[lang]
  const t: Translate = (key, params) => {
    const template = dictionary[key] ?? es[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  }
  const formatter = new Map<number, Intl.NumberFormat>()
  const number = (value: number, digits = 1) => {
    if (!formatter.has(digits)) {
      formatter.set(digits, new Intl.NumberFormat(locale, { maximumFractionDigits: digits }))
    }
    return formatter.get(digits)!.format(value)
  }
  return { lang, locale, t, number }
}

/** Idioma inicial: el guardado, o el del navegador (inglés si empieza por "en"). */
export function detectLanguage(stored: string | null, browser: string | undefined): Language {
  if (stored === 'es' || stored === 'en') return stored
  return (browser ?? 'es').toLowerCase().startsWith('en') ? 'en' : 'es'
}

/** Recomendaciones de un nivel, en orden (las claves existen de 1 a 3). */
export function recommendationKeys(level: string): MessageKey[] {
  return [1, 2, 3]
    .map((n) => `risk.rec.${level}.${n}`)
    .filter((key): key is MessageKey => key in es)
}
