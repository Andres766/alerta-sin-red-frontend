import type { AppDatabase } from './database'

/**
 * Preferencias del dispositivo. Viven en IndexedDB (y no en localStorage) porque
 * el Service Worker también las lee, por ejemplo para saber cuál es "mi zona".
 */
export class PreferencesRepository {
  constructor(private readonly db: () => Promise<AppDatabase>) {}

  async favoriteZoneId(): Promise<string | null> {
    const record = await (await this.db()).get('preferences', 'favoriteZoneId')
    return typeof record?.value === 'string' ? record.value : null
  }

  async setFavoriteZoneId(zoneId: string | null): Promise<void> {
    const db = await this.db()
    if (zoneId === null) await db.delete('preferences', 'favoriteZoneId')
    else await db.put('preferences', { key: 'favoriteZoneId', value: zoneId })
  }
}
