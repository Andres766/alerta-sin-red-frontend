import { Link } from 'react-router-dom'
import { IconMapPin } from '../components/icons'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada')
  return (
    <section className="rounded-lg border border-line bg-surface p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-raised text-fg">
        <IconMapPin className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-muted">Error 404</p>
      <h1 className="text-xl font-bold">Esta página no existe</h1>
      <p className="mt-1 text-muted">Puede que el enlace esté incompleto o haya cambiado.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/" className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary">
          Ver el riesgo de las zonas
        </Link>
        <Link to="/suscribirme" className="rounded-lg border border-control px-4 py-2.5 font-semibold">
          Alertas por SMS
        </Link>
      </div>
    </section>
  )
}
