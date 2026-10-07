import { useState } from 'react'
import { ZoneCard } from '../components/ZoneCard'
import type { DataSource, NearbyZone, ZoneRisk } from '../domain/types'
import { timeAgo } from '../domain/time'
import { useSnapshot } from '../hooks/useSnapshot'
import { riskService } from '../services'

type NearbyState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; zones: NearbyZone[]; source: DataSource }
  | { status: 'error'; message: string }

export function HomePage() {
  const { data, loading, error, refresh } = useSnapshot()
  const [nearby, setNearby] = useState<NearbyState>({ status: 'idle' })

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNearby({ status: 'error', message: 'Este dispositivo no permite obtener la ubicación.' })
      return
    }
    setNearby({ status: 'locating' })
    // La ubicación se usa solo para la consulta; no se almacena ni se envía a terceros.
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const result = await riskService.nearby(coords)
          setNearby({ status: 'done', ...result })
        } catch (e) {
          setNearby({ status: 'error', message: e instanceof Error ? e.message : 'Error' })
        }
      },
      () => setNearby({ status: 'error', message: 'No se concedió el permiso de ubicación.' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  }

  const byId = new Map<string, ZoneRisk>(data?.snapshot.items.map((i) => [i.zone.id, i]))

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Riesgo climático en tu zona</h1>
        <p className="mt-1 text-slate-600">
          Deslizamientos y crecientes estimados con inteligencia artificial a partir de lluvia,
          humedad del suelo y caudal de ríos. Funciona aunque te quedes sin internet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={locate}
            disabled={nearby.status === 'locating'}
            className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {nearby.status === 'locating' ? 'Ubicando…' : '📍 Zonas cerca de mí'}
          </button>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold disabled:opacity-60"
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </section>

      {nearby.status === 'error' && <p className="text-sm text-red-700">{nearby.message}</p>}
      {nearby.status === 'done' && (
        <section aria-labelledby="cerca">
          <h2 id="cerca" className="mb-3 text-lg font-semibold">
            Cerca de ti{' '}
            <span className="text-sm font-normal text-slate-500">
              ({nearby.source === 'network' ? 'consulta PostGIS' : 'calculado en el dispositivo'})
            </span>
          </h2>
          {nearby.zones.length === 0 ? (
            <p className="text-slate-600">No hay zonas monitoreadas en 50 km a la redonda.</p>
          ) : (
            <div className="grid gap-3">
              {nearby.zones.map(({ zone, distance_km }) => (
                <ZoneCard
                  key={zone.id}
                  item={byId.get(zone.id) ?? { zone, assessment: null }}
                  distanceKm={distance_km}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="todas">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="todas" className="text-lg font-semibold">Zonas monitoreadas</h2>
          {data && (
            <span className="text-xs text-slate-500">
              {data.source === 'network' ? 'Actualizado' : 'Guardado'} {timeAgo(data.savedAt)}
            </span>
          )}
        </div>
        {error && !data && (
          <p className="rounded-xl bg-amber-50 p-4 text-amber-900">{error}</p>
        )}
        {!data && loading && <p className="text-slate-500">Cargando…</p>}
        <div className="grid gap-3">
          {data?.snapshot.items.map((item) => <ZoneCard key={item.zone.id} item={item} />)}
        </div>
      </section>
    </div>
  )
}
