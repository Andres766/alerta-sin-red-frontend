import { useNavigate } from 'react-router-dom'
import type { LatLon } from '../domain/geo'
import { NOT_EVALUATED_COLOR, RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

const WIDTH = 400
const HEIGHT = 260
const PAD = 34
const CHAR_WIDTH = 6.2 // ancho aproximado de un carácter a 11 px

interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface Placement {
  x: number
  y: number
  anchor: 'start' | 'end' | 'middle'
  box: Box
}

/**
 * Prueba derecha, izquierda, abajo y arriba del punto y usa la primera posición que
 * no choque con otra etiqueta ni con un punto. Si ninguna cabe, no hay etiqueta:
 * el punto conserva su nombre accesible y su enlace.
 */
function placeLabel(x: number, y: number, text: string, placed: Box[]): Placement | null {
  const w = text.length * CHAR_WIDTH
  const candidates = [
    { x: x + 12, y: y + 4, anchor: 'start' as const, box: { x1: x + 12, y1: y - 7, x2: x + 12 + w, y2: y + 5 } },
    { x: x - 12, y: y + 4, anchor: 'end' as const, box: { x1: x - 12 - w, y1: y - 7, x2: x - 12, y2: y + 5 } },
    { x, y: y + 22, anchor: 'middle' as const, box: { x1: x - w / 2, y1: y + 11, x2: x + w / 2, y2: y + 23 } },
    { x, y: y - 14, anchor: 'middle' as const, box: { x1: x - w / 2, y1: y - 25, x2: x + w / 2, y2: y - 13 } },
  ]
  const fits = (b: Box) =>
    b.x1 >= 2 && b.x2 <= WIDTH - 2 && b.y1 >= 2 && b.y2 <= HEIGHT - 2 &&
    !placed.some((p) => b.x1 < p.x2 && b.x2 > p.x1 && b.y1 < p.y2 && b.y2 > p.y1)
  const choice = candidates.find((c) => fits(c.box))
  if (choice) placed.push(choice.box)
  return choice ?? null
}

/**
 * Mapa esquemático de las zonas, dibujado en SVG a partir de lat/lon.
 * No usa teselas de mapas externos: funciona igual sin conexión, que es
 * justamente cuando más se necesita.
 */
export function ZoneMap({ items, user }: { items: ZoneRisk[]; user?: LatLon | null }) {
  const navigate = useNavigate()
  const translator = useI18n()
  const { t } = translator
  if (items.length === 0) return null

  const points = [...items.map((i) => i.zone), ...(user ? [user] : [])]
  const lats = points.map((p) => p.latitude)
  const lons = points.map((p) => p.longitude)
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)]
  // Escala única en ambos ejes para no deformar las distancias.
  const span = Math.max(maxLat - minLat, (maxLon - minLon) * ((HEIGHT - 2 * PAD) / (WIDTH - 2 * PAD)), 0.1)
  const scale = (HEIGHT - 2 * PAD) / span
  const cx = (minLon + maxLon) / 2
  const cy = (minLat + maxLat) / 2
  const project = (p: LatLon) => ({
    x: WIDTH / 2 + (p.longitude - cx) * scale,
    y: HEIGHT / 2 - (p.latitude - cy) * scale,
  })

  const severity = (i: ZoneRisk) => (i.assessment ? RISK_LEVELS[i.assessment.level].severity : -1)
  // Con muchas zonas cercanas los puntos se achican para no taparse.
  const radius = items.length > 12 ? 6 : 7.5
  // Los puntos se dibujan de menor a mayor riesgo: el más grave queda encima.
  const ordered = [...items].sort((a, b) => severity(a) - severity(b))

  // Una etiqueta por municipio. Primero se reservan los puntos; luego se ubican las
  // etiquetas empezando por las zonas de mayor riesgo, que son las que más importan.
  const placed: Box[] = items.map(({ zone }) => {
    const { x, y } = project(zone)
    return { x1: x - radius - 1, y1: y - radius - 1, x2: x + radius + 1, y2: y + radius + 1 }
  })
  const labels = new Map<string, Placement>()
  const labeled = new Set<string>()
  for (const { zone } of [...items].sort((a, b) => severity(b) - severity(a))) {
    if (labeled.has(zone.municipality)) continue
    const { x, y } = project(zone)
    const placement = placeLabel(x, y, zone.municipality, placed)
    if (placement) {
      labels.set(zone.id, placement)
      labeled.add(zone.municipality)
    }
  }
  const summary = items
    .map((i) => `${i.zone.name}: ${levelLabel(translator, i.assessment?.level)}`)
    .join('; ')

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-surface">
      {/* Sin role="img": ese rol vuelve "presentacionales" a los hijos y ocultaba los
          enlaces de cada zona a los lectores de pantalla. */}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-labelledby="mapa-titulo" className="block w-full">
        <title id="mapa-titulo">{t('map.title', { summary })}</title>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" className="stroke-line" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} className="fill-raised" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />
        {ordered.map(({ zone, assessment }) => {
          const { x, y } = project(zone)
          const color = assessment ? RISK_LEVELS[assessment.level].color : NOT_EVALUATED_COLOR
          const urgent = assessment ? RISK_LEVELS[assessment.level].severity >= 2 : false
          const label = labels.get(zone.id)
          const href = `/zona/${zone.id}`
          return (
            // Enlace SVG real: enfocable, se puede abrir en otra pestaña y lo anuncian
            // los lectores de pantalla. El clic normal navega sin recargar la página.
            <a
              key={zone.id}
              href={href}
              aria-label={zone.name}
              className="cursor-pointer focus:outline-none"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                e.preventDefault()
                navigate(href)
              }}
            >
              {urgent && (
                <circle cx={x} cy={y} r={radius + 1.5} style={{ fill: color }} opacity={0.35} className="map-pulse" />
              )}
              <circle cx={x} cy={y} r={radius} style={{ fill: color }} className="stroke-surface" strokeWidth={2} />
              {label && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fontSize="11"
                  fontWeight="600"
                  className="fill-fg"
                  paintOrder="stroke"
                  style={{ stroke: 'var(--raised)' }}
                  strokeWidth="3"
                >
                  {zone.municipality}
                </text>
              )}
            </a>
          )
        })}
        {user && (() => {
          const { x, y } = project(user)
          return (
            <g aria-label={t('map.you')}>
              <circle cx={x} cy={y} r={11} className="fill-info-ink" opacity={0.18} />
              <circle cx={x} cy={y} r={5} className="fill-info-ink stroke-surface" strokeWidth={2} />
            </g>
          )
        })()}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
        {(['BAJO', 'MODERADO', 'ALTO', 'MUY_ALTO'] as const).map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: RISK_LEVELS[lvl].color }} />
            {levelLabel(translator, lvl)}
          </span>
        ))}
        {user && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-info-ink" /> {t('common.you')}
          </span>
        )}
        <span className="ml-auto text-faint">{t('map.note')}</span>
      </figcaption>
    </figure>
  )
}
