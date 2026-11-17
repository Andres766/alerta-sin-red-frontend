import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LatLon } from '../domain/geo'
import { LEVEL_ORDER, RISK_LEVELS } from '../domain/riskLevel'
import type { ZoneRisk } from '../domain/types'
import { useTheme } from '../hooks/useTheme'
import { levelLabel } from '../i18n/domain'
import { useI18n } from '../i18n/I18nProvider'

// Mapas base de Esri (sin clave): topográfico en claro, porque el relieve y los ríos
// explican el riesgo de deslizamiento y creciente; gris oscuro con nombres en oscuro.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const BASEMAPS: Record<'light' | 'dark', string[]> = {
  light: [`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`],
  dark: [
    `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  ],
}
const ATTRIBUTION =
  '&copy; <a href="https://www.esri.com">Esri</a>, ' +
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const severity = (i: ZoneRisk) => (i.assessment ? RISK_LEVELS[i.assessment.level].severity : -1)

/** Contenido del globo de una zona; con textContent, nunca HTML (los nombres los escribe un operador). */
function tooltip(name: string, detail: string): HTMLElement {
  const node = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = name
  const line = document.createElement('span')
  line.textContent = detail
  node.append(title, document.createElement('br'), line)
  return node
}

/**
 * Mapa real e interactivo de las zonas (Leaflet). Cada punto lleva el color de su
 * nivel de riesgo y abre la zona al tocarlo. La rueda del ratón no hace zoom hasta
 * que se hace clic en el mapa, para no atrapar el desplazamiento de la página.
 * Con `focusId` se centra en una zona (página de detalle) y la resalta.
 * Sin conexión, la app usa el esquema dibujado en el dispositivo (ZoneMap).
 */
export default function RiskMap({
  items,
  user,
  focusId,
  className = 'h-72 lg:h-96',
}: {
  items: ZoneRisk[]
  user?: LatLon | null
  focusId?: string
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const fittedFor = useRef('')
  const navigate = useNavigate()
  const { resolved } = useTheme()
  const translator = useI18n()
  const { t } = translator

  // El mapa se crea una sola vez.
  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomSnap: 0.5 })
    instance.attributionControl.setPrefix(false)
    instance.on('click', () => instance.scrollWheelZoom.enable())
    markers.current = L.layerGroup().addTo(instance)
    map.current = instance
    // El contenedor cambia de tamaño con el diseño (columnas, celular): Leaflet debe saberlo.
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
    }
  }, [])

  // Mapa base claro u oscuro.
  useEffect(() => {
    if (!map.current) return
    const layers = BASEMAPS[resolved].map((url) =>
      L.tileLayer(url, { attribution: ATTRIBUTION, maxZoom: 17, maxNativeZoom: 16 }).addTo(map.current!),
    )
    return () => {
      for (const layer of layers) layer.remove()
    }
  }, [resolved])

  // Puntos de las zonas (los más graves encima) y la ubicación de la persona.
  useEffect(() => {
    const instance = map.current
    const group = markers.current
    if (!instance || !group) return
    group.clearLayers()
    for (const item of [...items].sort((a, b) => severity(a) - severity(b))) {
      const { zone, assessment } = item
      const level = assessment?.level ?? null
      const href = `/zona/${zone.id}`
      const focused = zone.id === focusId
      L.circleMarker([zone.latitude, zone.longitude], {
        radius: focused ? 12 : level && RISK_LEVELS[level].severity >= 2 ? 9 : 7,
        weight: focused ? 3 : 2,
        className: `risk-dot risk-dot-${level ?? 'none'}${focused ? ' risk-dot-focus' : ''}`,
      })
        .bindTooltip(tooltip(zone.name, levelLabel(translator, level)), { direction: 'top', offset: [0, -8] })
        .on('click', () => navigate(href))
        .addTo(group)
    }
    if (user) {
      L.circleMarker([user.latitude, user.longitude], { radius: 6, weight: 3, className: 'user-dot' })
        .bindTooltip(t('map.you'), { direction: 'top', offset: [0, -6] })
        .addTo(group)
    }

    // Encuadre automático solo cuando cambia el conjunto de puntos: no se pierde el zoom
    // que haya hecho la persona cada vez que llegan datos nuevos.
    const focus = items.find((i) => i.zone.id === focusId)
    const points: L.LatLngTuple[] = items.map((i) => [i.zone.latitude, i.zone.longitude])
    if (user) points.push([user.latitude, user.longitude])
    const key = `${focusId ?? ''}|${points.map((p) => p.join(',')).join(';')}`
    if (points.length && key !== fittedFor.current) {
      // Vista de una zona: el entorno inmediato (laderas, ríos) a escala de municipio.
      if (focus) instance.setView([focus.zone.latitude, focus.zone.longitude], 12)
      else instance.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 11 })
      fittedFor.current = key
    }
  }, [items, user, focusId, navigate, translator, t])

  const summary = items.map((i) => `${i.zone.name}: ${levelLabel(translator, i.assessment?.level)}`).join('; ')

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-surface">
      <div
        ref={container}
        role="region"
        aria-label={t('map.realTitle', { summary })}
        className={`w-full ${className}`}
      />
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
        {[...LEVEL_ORDER].map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: RISK_LEVELS[lvl].color }} />
            {levelLabel(translator, lvl)}
          </span>
        ))}
        <span className="ml-auto text-faint">{t('map.hint')}</span>
      </figcaption>
    </figure>
  )
}
