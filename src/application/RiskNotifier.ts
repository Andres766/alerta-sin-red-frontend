import { RISK_LEVELS } from '../domain/riskLevel'
import type { RiskSnapshot } from '../domain/types'
import { alertLabel, levelLabel, recommendations } from '../i18n/domain'
import { createTranslator } from '../i18n/translator'
import type { PreferencesRepository } from '../infrastructure/storage/PreferencesRepository'

/** Muestra una notificación del sistema (en la página o en el Service Worker). */
export interface DeviceNotifier {
  show(title: string, options: { body: string; url: string; tag: string }): Promise<void>
}

/** Nivel desde el cual se avisa en el dispositivo (igual que el SMS: alerta naranja). */
const NOTIFY_FROM_SEVERITY = 2

/**
 * Avisa en el dispositivo cuando "mi zona" sube a riesgo alto o muy alto.
 * Solo notifica si el nivel subió respecto del último aviso: así no repite la
 * misma notificación en cada actualización. Lo usan la página y el Service
 * Worker (este último incluso con la app cerrada, vía Periodic Background Sync).
 */
export class RiskNotifier {
  constructor(
    private readonly preferences: PreferencesRepository,
    private readonly notifier: DeviceNotifier,
  ) {}

  async check(snapshot: RiskSnapshot): Promise<boolean> {
    if (!(await this.preferences.notificationsEnabled())) return false
    const zoneId = await this.preferences.favoriteZoneId()
    const item = snapshot.items.find((i) => i.zone.id === zoneId)
    if (!zoneId || !item?.assessment) return false

    const info = RISK_LEVELS[item.assessment.level]
    const last = await this.preferences.lastNotifiedSeverity(zoneId)

    if (info.severity >= NOTIFY_FROM_SEVERITY && info.severity > (last ?? -1)) {
      const translator = createTranslator(await this.preferences.language())
      const level = item.assessment.level
      await this.notifier.show(translator.t('deviceAlerts.title', { alert: alertLabel(translator, level), zone: item.zone.name }), {
        body: translator.t('deviceAlerts.body', {
          level: levelLabel(translator, level),
          action: recommendations(translator, level)[0] ?? '',
        }),
        url: `/zona/${zoneId}`,
        tag: `riesgo-${zoneId}`, // reemplaza la notificación anterior de la misma zona
      })
      await this.preferences.setLastNotifiedSeverity(zoneId, info.severity)
      return true
    }
    if (info.severity < NOTIFY_FROM_SEVERITY && last !== null) {
      // El riesgo bajó: si vuelve a subir, se avisará de nuevo.
      await this.preferences.setLastNotifiedSeverity(zoneId, null)
    }
    return false
  }
}
