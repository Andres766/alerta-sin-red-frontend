import type { ReactNode } from 'react'

/** Piezas compartidas del panel: mismo marco, mismos controles en todas las secciones. */

export const field = 'w-full rounded-md border border-control bg-surface px-3 py-2 text-[15px]'
export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50'
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-control bg-surface px-3.5 py-2 text-sm font-medium transition hover:bg-raised disabled:opacity-50'

export function Card({ title, lead, actions, children, flush = false }: {
  title: string
  lead?: string
  actions?: ReactNode
  children: ReactNode
  /** Sin relleno interno: para listas y tablas que llegan al borde. */
  flush?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {lead && <p className="mt-0.5 text-sm text-muted">{lead}</p>}
        </div>
        {actions}
      </header>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

export function Message({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role="status" className={`text-sm ${ok ? 'text-positive-ink' : 'text-negative-ink'}`}>
      {children}
    </p>
  )
}
