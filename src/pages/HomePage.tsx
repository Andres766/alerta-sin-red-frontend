import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMapPin, IconRefresh, IconStar } from '../components/icons'
import { RelativeTime } from '../components/RelativeTime'
import { RiskSummary } from '../components/RiskSummary'
import { ZoneCard } from '../components/ZoneCard'
import { ZoneFilters } from '../components/ZoneFilters'
import { ZoneMap } from '../components/ZoneMap'
import type { LatLon } from '../domain/geo'
import { isStale, latestIso, STALE_AFTER_HOURS } from '../domain/time'
import type { DataSource, NearbyZone, ZoneRisk } from '../domain/types'
import { filterZones, type LevelFilter } from '../domain/zoneFilter'
import { useFavoriteZone } from '../hooks/useFavoriteZone'
import { useNow } from '../hooks/useNow'
import { useSnapshot } from '../hooks/useSnapshot'
import { riskService } from '../services'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type NearbyState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; zones: NearbyZone[]; source: DataSource; position: LatLon }
  | { status: 'error'; message: string }

function SkeletonList() {
  return (
    <div className="grid gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  )
}

export function HomePage() {
  const { data, loading, error, refresh } = useSnapshot()
  const [nearby, setNearby] = useState<NearbyState>({ status: 'idle' })
  useDocumentTitle('Riesgo climático en tu zona')

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNearby({ status: 'error', message: 'Este dispositivo no permite obtener la ubicación.' })
      return
    }
    setNearby({ status: 'locating' })
    // La ubicación se usa solo para la consulta; no se almacena ni se envía a terceros.
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const position = { latitude: coords.latitude, longitude: coords.longitude }
        try {
          const result = await riskService.nearby(position)
          setNearby({ status: 'done', ...result, position })
        } catch (e) {
          setNearby({ status: 'error', message: e instanceof Error ? e.message : 'Error' })
        }
      },
      () => setNearby({ status: 'error', message: 'No se concedió el permiso de ubicación.' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  }

  const { favoriteId } = useFavoriteZone()
  const items = useMemo(() => data?.snapshot.items ?? [], [data])
  const favorite = items.find((i) => i.zone.id === favoriteId)
  const now = useNow()
  const lastEvaluation = latestIso(items.map((i) => i.assessment?.assessed_at))
  const stale = lastEvaluation !== null && isStale(lastEvaluation, now)
  const [query, setQuery] = useState('')
  const [levels, setLevels] = useState<ReadonlySet<LevelFilter>>(new Set())
  const visible = useMemo(() => filterZones(items, query, levels), [items, query, levels])
  const toggleLevel = (level: LevelFilter) =>
    setLevels((current) => {
      const next = new Set(current)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  const byId = new Map<string, ZoneRisk>(items.map((i) => [i.zone.id, i]))

  return (
    <div className="space-y-6">
      {favorite && (
        <section aria-labelledby="mi-zona" className="space-y-2">
          <h2 id="mi-zona" className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <IconStar filled className="size-4" /> Mi zona
          </h2>
          <ZoneCard item={favorite} />
        </section>
      )}
      {stale && lastEvaluation && (
        <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Datos desactualizados:</strong> la última evaluación es de{' '}
          <RelativeTime iso={lastEvaluation} /> (más de {STALE_AFTER_HOURS} horas). El riesgo actual
          puede ser distinto: si llueve fuerte, siga las indicaciones de las autoridades.
        </p>
      )}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {data ? (
          <RiskSummary items={items} />
        ) : (
          <div className="h-48 animate-pulse rounded-3xl bg-slate-300/60" aria-hidden />
        )}
        {items.length > 0 && (
          <ZoneMap items={items} user={nearby.status === 'done' ? nearby.position : null} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={locate}
          disabled={nearby.status === 'locating'}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          <IconMapPin className="size-5" />
          {nearby.status === 'locating' ? 'Ubicando…' : 'Cerca de mí'}
        </button>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <IconRefresh className={`size-5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {nearby.status === 'error' && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{nearby.message}</p>
      )}

      {nearby.status === 'done' && (
        <section aria-labelledby="cerca" className="space-y-3">
          <h2 id="cerca" className="text-lg font-bold">
            Cerca de usted{' '}
            <span className="text-sm font-normal text-slate-500">
              ({nearby.source === 'network' ? 'consulta espacial PostGIS' : 'calculado en el dispositivo'})
            </span>
          </h2>
          {nearby.zones.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-slate-600">
              No hay zonas monitoreadas en 50 km a la redonda.
            </p>
          ) : (
            <div className="grid gap-3">
              {nearby.zones.map(({ zone, distance_km }) => (
                <ZoneCard key={zone.id} item={byId.get(zone.id) ?? { zone, assessment: null }} distanceKm={distance_km} />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="todas" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="todas" className="text-lg font-bold">Zonas monitoreadas</h2>
          {data && (
            <span className="text-xs text-slate-500">
              {data.source === 'network' ? 'Actualizado' : 'Guardado'} <RelativeTime iso={data.savedAt} />
            </span>
          )}
        </div>
        {error && !data && <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">{error}</p>}
        {!data && loading && <SkeletonList />}
        {items.length > 0 && (
          <ZoneFilters query={query} onQuery={setQuery} levels={levels} onToggleLevel={toggleLevel} />
        )}
        {(query || levels.size > 0) && (
          <p role="status" className="text-sm text-slate-600">
            Mostrando {visible.length} de {items.length} zonas
            {visible.length === 0 && ' · ninguna coincide con la búsqueda'}
          </p>
        )}
        <div className="grid gap-3">
          {visible.map((item) => <ZoneCard key={item.zone.id} item={item} />)}
        </div>
      </section>

      <p className="text-center text-sm text-slate-600">
        <Link to="/como-funciona" className="font-semibold underline">
          ¿Cómo se calcula el riesgo?
        </Link>
      </p>
      <p className="text-center text-xs text-slate-500 sm:hidden">
        En emergencia llame al <strong>123</strong>
      </p>
    </div>
  )
}
