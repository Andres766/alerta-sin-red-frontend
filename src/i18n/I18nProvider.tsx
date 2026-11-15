import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { preferences } from '../services'
import { createTranslator, detectLanguage, type Language, type Translator } from './translator'

const STORAGE_KEY = 'alerta-sin-red:lang'

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

interface I18nState extends Translator {
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nState | null>(null)

/** Idioma de la interfaz (español o inglés), recordado en el dispositivo. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => detectLanguage(readStored(), navigator.language))
  const translator = useMemo(() => createTranslator(lang), [lang])

  useEffect(() => {
    document.documentElement.lang = translator.locale
    // El Service Worker no puede leer localStorage: el idioma de las notificaciones
    // se guarda también en IndexedDB.
    void preferences.setLanguage(lang).catch(() => undefined)
  }, [lang, translator.locale])

  const setLanguage = useCallback((next: Language) => {
    setLang(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* sin almacenamiento: el cambio dura esta visita */
    }
  }, [])

  const value = useMemo(() => ({ ...translator, setLanguage }), [translator, setLanguage])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n debe usarse dentro de <I18nProvider>')
  return context
}
