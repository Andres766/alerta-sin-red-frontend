import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DeviceAlertsToggle } from '../components/DeviceAlertsToggle'
import { IconChevronRight, IconMapPin, IconRefresh, IconSparkles, IconStar } from '../components/icons'
import { InstallBanner } from '../components/InstallBanner'
import { RegionStatus } from '../components/RegionStatus'
import { RelativeTime } from '../components/RelativeTime'
import { ZoneCard, ZoneList } from '../components/ZoneCard'
import { ZoneFilters } from '../components/ZoneFilters'
import { ZoneMap } from '../components/ZoneMap'
import type { LatLon } from '../domain/geo'
import { isStale, latestIso, STALE_AFTER_HOURS } from '../domain/time'
import type { DataSource, NearbyZone, ZoneRisk } from '../domain/types'
import { filterZones, type LevelFilter } from '../domain/zoneFilter'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFavoriteZone } from '../hooks/useFavoriteZone'
import { useNow } from '../hooks/useNow'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useSnapshot } from '../hooks/useSnapshot'
import { useI18n } from '../i18n/I18nProvider'
import { rich } from '../i18n/rich'
import { riskService } from '../services'

// Leaflet pesa ~45 KB: se descarga solo al mostrar el mapa.
const RiskMap = lazy(() => import('../components/RiskMap'))

type NearbyState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; zones: NearbyZone[]; source: DataSource; position: LatLon }
  | { status: 'error'; message: string }

function SkeletonList() {
  return (
    <ZoneList>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4" aria-hidden>
          <div className="size-9 animate-pulse rounded-md bg-active" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-active" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-active" />
          </div>
        </div>
      ))}
    </ZoneList>
  )
}

/** Encabezado pequeño de una sección del panel lateral. */
function PanelHeading({ id, icon, children, aside }: { id: string; icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-8 flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {children}
      </h2>
      {aside}
    </div>
  )
}

const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-control bg-surface px-3.5 py-2 text-sm font-medium transition hover:bg-raised disabled:opacity-60'

export function HomePage() {
  const translator = useI18n()
  const { t } = translator
  const { data, loading, error, refresh } = useSnapshot()
  const online = useOnlineStatus()
  const [nearby, setNearby] = useState<NearbyState>({ status: 'idle' })
  useDocumentTitle(t('home.docTitle'))

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNearby({ status: 'error', message: t('home.geoUnsupported') })
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
      () => setNearby({ status: 'error', message: t('home.geoDenied') }),
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
      {/* Título de la pantalla, frescura de los datos y acciones */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t('home.title')}</h1>
          <p className="mt-1 text-sm text-muted">
            {t('home.subtitle', { count: items.length || '—' })}
            {data && (
              <>
                {' · '}
                {rich(t(data.source === 'network' ? 'home.updated' : 'home.saved'), {
                  ago: <RelativeTime iso={data.savedAt} />,
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={locate} disabled={nearby.status === 'locating'} className={secondaryButton}>
            <IconMapPin className="size-4" />
            {nearby.status === 'locating' ? t('home.locating') : t('home.nearMe')}
          </button>
          <button onClick={() => void refresh()} disabled={loading} className={secondaryButton}>
            <IconRefresh className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('home.refreshing') : t('common.update')}
          </button>
        </div>
      </header>

      {stale && lastEvaluation && (
        <p role="alert" className="rounded-lg border border-warning-line bg-warning-bg px-4 py-3 text-sm text-warning-ink">
          <strong className="font-semibold">{t('home.staleTitle')}</strong>{' '}
          {rich(t('home.staleBody'), { ago: <RelativeTime iso={lastEvaluation} />, hours: STALE_AFTER_HOURS })}
        </p>
      )}
      {nearby.status === 'error' && (
        <p role="alert" className="rounded-lg border border-negative-ink/30 bg-negative-bg px-4 py-3 text-sm text-negative-ink">
          {nearby.message}
        </p>
      )}

      {data ? (
        <RegionStatus items={items} />
      ) : (
        <div className="h-36 animate-pulse rounded-lg border border-line bg-surface" aria-hidden />
      )}

      {/* Dos columnas en escritorio: zonas a la izquierda; mi zona y mapa a la derecha.
          En celular se apilan con "Mi zona" primero. */}
      <div className="grid gap-6 [grid-template-areas:'fav'_'list'_'map'_'extra'] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_auto_1fr] lg:[grid-template-areas:'list_fav'_'list_map'_'list_extra']">
        <div className="min-w-0 space-y-6 [grid-area:list]">
          {nearby.status === 'done' && (
            <section aria-labelledby="cerca">
              <PanelHeading
                id="cerca"
                icon={<IconMapPin className="size-4 text-muted" />}
                aside={
                  <span className="text-xs text-muted">
                    {nearby.source === 'network' ? t('home.nearbyNetwork') : t('home.nearbyDevice')}
                  </span>
                }
              >
                {t('home.nearby')}
              </PanelHeading>
              {nearby.zones.length === 0 ? (
                <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">{t('home.nearbyEmpty')}</p>
              ) : (
                <ZoneList>
                  {nearby.zones.map(({ zone, distance_km }) => (
                    <ZoneCard key={zone.id} item={byId.get(zone.id) ?? { zone, assessment: null }} distanceKm={distance_km} />
                  ))}
                </ZoneList>
              )}
            </section>
          )}

          <section aria-labelledby="todas" className="space-y-3">
            <PanelHeading id="todas">{t('home.allZones')}</PanelHeading>
            {error && !data && (
              <p className="rounded-lg border border-warning-line bg-warning-bg p-4 text-sm text-warning-ink">{error}</p>
            )}
            {items.length > 0 && (
              <ZoneFilters query={query} onQuery={setQuery} levels={levels} onToggleLevel={toggleLevel} />
            )}
            {(query || levels.size > 0) && (
              <p role="status" className="text-sm text-muted">
                {t('filter.showing', { shown: visible.length, total: items.length })}
                {visible.length === 0 && ` · ${t('filter.none')}`}
              </p>
            )}
            {!data && loading && <SkeletonList />}
            {visible.length > 0 && (
              <ZoneList>
                {visible.map((item) => <ZoneCard key={item.zone.id} item={item} />)}
              </ZoneList>
            )}
          </section>
        </div>

        <section aria-labelledby="mi-zona" className="[grid-area:fav]">
          <PanelHeading
            id="mi-zona"
            icon={<IconStar filled className="size-4 text-risk-moderate" />}
            aside={favorite ? <DeviceAlertsToggle /> : undefined}
          >
            {t('home.myZone')}
          </PanelHeading>
          {favorite ? (
            <ZoneList>
              <ZoneCard item={favorite} />
            </ZoneList>
          ) : (
            <p className="rounded-lg border border-dashed border-control px-4 py-3.5 text-sm text-muted">
              {t('home.myZoneEmpty')}
            </p>
          )}
        </section>

        {items.length > 0 && (
          <section aria-labelledby="mapa" className="[grid-area:map]">
            <PanelHeading id="mapa">{t('home.map')}</PanelHeading>
            {online ? (
              <Suspense fallback={<div className="h-80 animate-pulse rounded-lg border border-line bg-surface" aria-hidden />}>
                <RiskMap items={items} user={nearby.status === 'done' ? nearby.position : null} />
              </Suspense>
            ) : (
              // Sin red no hay mapa base: el esquema se dibuja en el dispositivo.
              <ZoneMap items={items} user={nearby.status === 'done' ? nearby.position : null} />
            )}
          </section>
        )}

        <div className="space-y-4 [grid-area:extra]">
          <InstallBanner />
          <Link
            to="/como-funciona"
            className="group flex items-start gap-3 rounded-lg border border-line bg-surface p-4 transition hover:border-control"
          >
            <IconSparkles className="mt-0.5 size-4.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('home.how')}</span>
              <span className="mt-0.5 block text-sm text-muted">{t('home.howBody')}</span>
            </span>
            <IconChevronRight className="mt-0.5 size-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
          </Link>
          <p className="text-center text-xs text-muted lg:hidden">{t('app.emergency', { phone: '123' })}</p>
        </div>
      </div>
    </div>
  )
}
