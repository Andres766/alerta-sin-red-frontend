import type { Language } from '../../i18n/translator'
import type { AppDatabase } from './database'

/**
 * Preferencias del dispositivo. Viven en IndexedDB (y no en localStorage) porque
 * el Service Worker también las lee, por ejemplo para saber cuál es "mi zona".
 */
export class PreferencesRepository {
  constructor(private readonly db: () => Promise<AppDatabase>) {}

  favoriteZoneId(): Promise<string | null> {
    return this.get('favoriteZoneId')
  }

  setFavoriteZoneId(zoneId: string | null): Promise<void> {
    return this.set('favoriteZoneId', zoneId)
  }

  async notificationsEnabled(): Promise<boolean> {
    return (await this.get('notificationsEnabled')) === '1'
  }

  setNotificationsEnabled(enabled: boolean): Promise<void> {
    return this.set('notificationsEnabled', enabled ? '1' : null)
  }

  /** Idioma de la interfaz; el Service Worker lo usa para redactar las notificaciones. */
  async language(): Promise<Language> {
    return (await this.get('language')) === 'en' ? 'en' : 'es'
  }

  setLanguage(lang: Language): Promise<void> {
    return this.set('language', lang)
  }

  /** Severidad (0–3) del último aviso mostrado para una zona, o null si no hay aviso vigente. */
  async lastNotifiedSeverity(zoneId: string): Promise<number | null> {
    const value = await this.get(`notified:${zoneId}`)
    return value === null ? null : Number(value)
  }

  setLastNotifiedSeverity(zoneId: string, severity: number | null): Promise<void> {
    return this.set(`notified:${zoneId}`, severity === null ? null : String(severity))
  }

  private async get(key: string): Promise<string | null> {
    const record = await (await this.db()).get('preferences', key)
    return typeof record?.value === 'string' ? record.value : null
  }

  private async set(key: string, value: string | null): Promise<void> {
    const db = await this.db()
    if (value === null) await db.delete('preferences', key)
    else await db.put('preferences', { key, value })
  }
}
