import { useState, type FormEvent } from 'react'
import type { HazardType, NewZone, Zone } from '../../domain/types'
import { useSnapshot } from '../../hooks/useSnapshot'
import { adminService } from '../../services'
import { IconMapPin } from '../icons'
import { hazardLabel } from '../../i18n/domain'
import { useI18n } from '../../i18n/I18nProvider'

const HAZARDS: HazardType[] = ['DESLIZAMIENTO', 'CRECIENTE', 'MIXTO']
const field = 'rounded-md border border-control bg-surface px-3 py-2'

const EMPTY: NewZone = {
  name: '', municipality: '', department: 'Nariño', hazard_type: 'DESLIZAMIENTO',
  susceptibility: 3, slope_deg: 10, latitude: 1.21, longitude: -77.28,
}

function ZoneRow({ zone, token, onSaved }: { zone: Zone; token: string; onSaved: (msg: string) => void }) {
  const translator = useI18n()
  const [hazard, setHazard] = useState(zone.hazard_type)
  const [susceptibility, setSusceptibility] = useState(zone.susceptibility)
  const [slope, setSlope] = useState(zone.slope_deg)
  const changed = hazard !== zone.hazard_type || susceptibility !== zone.susceptibility || slope !== zone.slope_deg

  const save = async () => {
    try {
      // Solo los campos que cambiaron: la bitácora del servidor refleja el cambio real.
      await adminService.updateZone(token, zone.id, {
        ...(hazard !== zone.hazard_type && { hazard_type: hazard }),
        ...(susceptibility !== zone.susceptibility && { susceptibility }),
        ...(slope !== zone.slope_deg && { slope_deg: slope }),
      })
      onSaved(`Zona actualizada: ${zone.name}`)
    } catch (err) {
      onSaved(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
      <span className="min-w-0">
        <span className="block truncate font-medium">{zone.name}</span>
        <span className="text-xs text-muted">
          {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
        </span>
      </span>
      <select aria-label={`Amenaza de ${zone.name}`} value={hazard}
        onChange={(e) => setHazard(e.target.value as HazardType)} className={field}>
        {HAZARDS.map((h) => <option key={h} value={h}>{hazardLabel(translator, h)}</option>)}
      </select>
      <label className="flex items-center gap-1 text-sm">
        Susc.
        <select aria-label={`Susceptibilidad de ${zone.name}`} value={susceptibility}
          onChange={(e) => setSusceptibility(Number(e.target.value))} className={field}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm">
        Pend.
        <input type="number" min={0} max={90} step={0.5} aria-label={`Pendiente de ${zone.name}`}
          value={slope} onChange={(e) => setSlope(Number(e.target.value))} className={`${field} w-20`} />°
      </label>
      <button type="button" disabled={!changed} onClick={() => void save()}
        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-30">
        Guardar
      </button>
    </li>
  )
}

/** Registro y actualización de zonas (solo administradores). */
export function ZonesPanel({ token }: { token: string }) {
  const translator = useI18n()
  const { data, refresh } = useSnapshot()
  const [draft, setDraft] = useState<NewZone>(EMPTY)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const zones = data?.snapshot.items.map((i) => i.zone) ?? []

  const set = <K extends keyof NewZone>(key: K, value: NewZone[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const afterChange = async (msg: string) => {
    setMessage(msg)
    await refresh()
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const zone = await adminService.createZone(token, draft)
      setDraft(EMPTY)
      await afterChange(`Zona registrada: ${zone.name}. Se evaluará en la próxima ejecución.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar la zona')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <IconMapPin className="size-5 text-muted" /> Zonas monitoreadas
      </h2>
      <p className="mt-1 text-sm text-muted">
        Ajuste la capa estática (amenaza, susceptibilidad SGC de 1 a 5 y pendiente) o registre zonas nuevas.
      </p>
      <ul className="mt-2 divide-y divide-rule">
        {zones.map((z) => (
          // key con los valores: si cambian en el servidor, la fila se reinicia con ellos
          <ZoneRow key={`${z.id}-${z.hazard_type}-${z.susceptibility}-${z.slope_deg}`} zone={z} token={token}
            onSaved={(msg) => void afterChange(msg)} />
        ))}
      </ul>

      <form onSubmit={create} className="mt-4 grid gap-2 rounded-md bg-raised p-3 sm:grid-cols-2">
        <h3 className="text-sm font-semibold sm:col-span-2">Registrar una zona nueva</h3>
        <input required minLength={3} maxLength={120} placeholder="Nombre (p. ej. Ipiales - Barrio El Charco)"
          aria-label="Nombre de la zona" value={draft.name} onChange={(e) => set('name', e.target.value)} className={`${field} sm:col-span-2`} />
        <input required minLength={2} maxLength={80} placeholder="Municipio" aria-label="Municipio"
          value={draft.municipality} onChange={(e) => set('municipality', e.target.value)} className={field} />
        <input required minLength={2} maxLength={80} placeholder="Departamento" aria-label="Departamento"
          value={draft.department} onChange={(e) => set('department', e.target.value)} className={field} />
        <select aria-label="Tipo de amenaza" value={draft.hazard_type}
          onChange={(e) => set('hazard_type', e.target.value as HazardType)} className={field}>
          {HAZARDS.map((h) => <option key={h} value={h}>{hazardLabel(translator, h)}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">Susceptibilidad (1–5)
            <input type="number" min={1} max={5} required value={draft.susceptibility}
              onChange={(e) => set('susceptibility', Number(e.target.value))} className={`${field} w-full`} />
          </label>
          <label className="text-xs text-muted">Pendiente (°)
            <input type="number" min={0} max={90} step={0.5} required value={draft.slope_deg}
              onChange={(e) => set('slope_deg', Number(e.target.value))} className={`${field} w-full`} />
          </label>
        </div>
        <label className="text-xs text-muted">Latitud
          <input type="number" step="0.0001" min={-4.3} max={13.6} required value={draft.latitude}
            onChange={(e) => set('latitude', Number(e.target.value))} className={`${field} w-full`} />
        </label>
        <label className="text-xs text-muted">Longitud
          <input type="number" step="0.0001" min={-82} max={-66.8} required value={draft.longitude}
            onChange={(e) => set('longitude', Number(e.target.value))} className={`${field} w-full`} />
        </label>
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2.5 font-semibold text-on-primary disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
          {busy ? 'Registrando…' : 'Registrar zona'}
        </button>
      </form>
      {message && <p role="status" className="mt-2 text-sm text-fg">{message}</p>}
    </section>
  )
}
