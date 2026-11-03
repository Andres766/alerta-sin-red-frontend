import { Link } from 'react-router-dom'
import { IconMapPin } from '../components/icons'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada')
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
        <IconMapPin className="size-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-500">Error 404</p>
      <h1 className="text-xl font-bold">Esta página no existe</h1>
      <p className="mt-1 text-slate-600">Puede que el enlace esté incompleto o haya cambiado.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/" className="rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-white">
          Ver el riesgo de las zonas
        </Link>
        <Link to="/suscribirme" className="rounded-2xl border border-slate-300 px-4 py-2.5 font-semibold">
          Alertas por SMS
        </Link>
      </div>
    </section>
  )
}
