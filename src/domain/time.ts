const relativeFormats = new Map<string, Intl.RelativeTimeFormat>()

function relative(locale: string): Intl.RelativeTimeFormat {
  let format = relativeFormats.get(locale)
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    relativeFormats.set(locale, format)
  }
  return format
}

/** "hace 5 minutos" / "5 minutes ago"… para dejar claro qué tan viejo es un dato. */
export function timeAgo(iso: string, now: number = Date.now(), locale = 'es-CO'): string {
  // Un instante apenas en el futuro (relojes del servidor y del celular desfasados)
  // se muestra como "ahora", no como "dentro de 12 segundos".
  const seconds = Math.min(0, Math.round((new Date(iso).getTime() - now) / 1000))
  const abs = Math.abs(seconds)
  const format = relative(locale)
  if (abs < 60) return format.format(seconds, 'second')
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour')
  return format.format(Math.round(seconds / 86400), 'day')
}

export function formatDateTime(iso: string, locale = 'es-CO'): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
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

/** Fecha de hoy en Colombia (UTC-5, sin horario de verano) como "AAAA-MM-DD". */
export function colombiaToday(now: number = Date.now()): string {
  return new Date(now - 5 * 3600 * 1000).toISOString().slice(0, 10)
}

/** Los últimos `count` días terminando en `today`, del más antiguo al más reciente. */
export function lastDays(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`)
  return Array.from({ length: count }, (_, k) =>
    new Date(end - (count - 1 - k) * 86_400_000).toISOString().slice(0, 10),
  )
}
