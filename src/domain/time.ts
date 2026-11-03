const relative = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })

/** "hace 5 minutos", "hace 2 horas"… para dejar claro qué tan viejo es un dato. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relative.format(seconds, 'second')
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  return relative.format(Math.round(seconds / 86400), 'day')
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Más allá de esto, la evaluación ya no refleja necesariamente el riesgo actual. */
export const STALE_AFTER_HOURS = 3

export function isStale(iso: string, now: number = Date.now(), maxHours = STALE_AFTER_HOURS): boolean {
  return now - new Date(iso).getTime() > maxHours * 3600 * 1000
}

/** La evaluación más reciente entre varias (o null si no hay ninguna). */
export function latestIso(isoDates: (string | null | undefined)[]): string | null {
  return isoDates.reduce<string | null>(
    (latest, iso) => (iso && (!latest || iso > latest) ? iso : latest),
    null,
  )
}
