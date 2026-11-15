import { useState, type FormEvent } from 'react'
import type { HazardType, NewZone, Zone } from '../../domain/types'
import { useSnapshot } from '../../hooks/useSnapshot'
import { hazardLabel } from '../../i18n/domain'
import { useI18n } from '../../i18n/I18nProvider'
import { adminService } from '../../services'
import { Card, Field, field, primaryButton } from './ui'

const HAZARDS: HazardType[] = ['DESLIZAMIENTO', 'CRECIENTE', 'MIXTO']
const compact = 'rounded-md border border-control bg-surface px-2.5 py-1.5 text-sm'

const EMPTY: NewZone = {
  name: '', municipality: '', department: 'Nariño', hazard_type: 'DESLIZAMIENTO',
  susceptibility: 3, slope_deg: 10, latitude: 1.21, longitude: -77.28,
}

const ROW = 'grid gap-2 px-5 py-3 md:grid-cols-[minmax(0,1fr)_13rem_5rem_6rem_6rem] md:items-center'

function ZoneRow({ zone, token, onSaved }: { zone: Zone; token: string; onSaved: (msg: string) => void }) {
  const translator = useI18n()
  const { t } = translator
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
      onSaved(t('zones.updated', { zone: zone.name }))
    } catch (err) {
      onSaved(err instanceof Error ? err.message : t('zones.updateFailed'))
    }
  }

  return (
    <li className={ROW}>
      <span className="min-w-0">
        <span className="block truncate font-medium">{zone.name}</span>
        <span className="num text-xs text-muted">
          {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
        </span>
      </span>
      <select aria-label={t('zones.hazardOf', { zone: zone.name })} value={hazard}
        onChange={(e) => setHazard(e.target.value as HazardType)} className={compact}>
        {HAZARDS.map((h) => <option key={h} value={h}>{hazardLabel(translator, h)}</option>)}
      </select>
      <select aria-label={t('zones.suscOf', { zone: zone.name })} value={susceptibility}
        onChange={(e) => setSusceptibility(Number(e.target.value))} className={compact}>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <input type="number" min={0} max={90} step={0.5} aria-label={t('zones.slopeOf', { zone: zone.name })}
        value={slope} onChange={(e) => setSlope(Number(e.target.value))} className={`${compact} num`} />
      <button type="button" disabled={!changed} onClick={() => void save()}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition disabled:opacity-30">
        {t('common.save')}
      </button>
    </li>
  )
}

/** Registro y actualización de zonas (solo administradores). */
export function ZonesPanel({ token }: { token: string }) {
  const translator = useI18n()
  const { t } = translator
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
      await afterChange(t('zones.registered', { zone: zone.name }))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('zones.registerFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card title={t('zones.title')} lead={t('zones.lead')} flush>
        <div className={`${ROW} hidden border-b border-line bg-raised py-2 text-xs font-medium text-muted md:grid`} aria-hidden>
          <span>{t('zones.colZone')}</span>
          <span>{t('zones.colHazard')}</span>
          <span>{t('zones.colSusc')}</span>
          <span>{t('zones.colSlope')}</span>
          <span />
        </div>
        <ul className="divide-y divide-rule">
          {zones.map((z) => (
            // key con los valores: si cambian en el servidor, la fila se reinicia con ellos
            <ZoneRow key={`${z.id}-${z.hazard_type}-${z.susceptibility}-${z.slope_deg}`} zone={z} token={token}
              onSaved={(msg) => void afterChange(msg)} />
          ))}
        </ul>
        {message && <p role="status" className="border-t border-line px-5 py-3 text-sm">{message}</p>}
      </Card>

      <Card title={t('zones.new')}>
        <form onSubmit={create} className="grid grid-cols-2 gap-4">
          <Field label={t('zones.name')} className="col-span-2">
            <input required minLength={3} maxLength={120} placeholder={t('zones.namePlaceholder')}
              value={draft.name} onChange={(e) => set('name', e.target.value)} className={field} />
          </Field>
          <Field label={t('zones.municipality')}>
            <input required minLength={2} maxLength={80}
              value={draft.municipality} onChange={(e) => set('municipality', e.target.value)} className={field} />
          </Field>
          <Field label={t('zones.department')}>
            <input required minLength={2} maxLength={80}
              value={draft.department} onChange={(e) => set('department', e.target.value)} className={field} />
          </Field>
          <Field label={t('zones.hazard')} className="col-span-2">
            <select value={draft.hazard_type} onChange={(e) => set('hazard_type', e.target.value as HazardType)} className={field}>
              {HAZARDS.map((h) => <option key={h} value={h}>{hazardLabel(translator, h)}</option>)}
            </select>
          </Field>
          <Field label={t('zones.susceptibility')}>
            <input type="number" min={1} max={5} required value={draft.susceptibility}
              onChange={(e) => set('susceptibility', Number(e.target.value))} className={field} />
          </Field>
          <Field label={t('zones.slope')}>
            <input type="number" min={0} max={90} step={0.5} required value={draft.slope_deg}
              onChange={(e) => set('slope_deg', Number(e.target.value))} className={field} />
          </Field>
          <Field label={t('zones.latitude')}>
            <input type="number" step="0.0001" min={-4.3} max={13.6} required value={draft.latitude}
              onChange={(e) => set('latitude', Number(e.target.value))} className={field} />
          </Field>
          <Field label={t('zones.longitude')}>
            <input type="number" step="0.0001" min={-82} max={-66.8} required value={draft.longitude}
              onChange={(e) => set('longitude', Number(e.target.value))} className={field} />
          </Field>
          <button disabled={busy} className={`${primaryButton} col-span-2 justify-self-start`}>
            {busy ? t('zones.registering') : t('zones.register')}
          </button>
        </form>
      </Card>
    </div>
  )
}
