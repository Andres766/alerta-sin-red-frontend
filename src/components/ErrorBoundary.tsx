import { Component, type ErrorInfo, type ReactNode } from 'react'
import { IconAlert } from './icons'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Captura errores de renderizado para que una falla en una pantalla no deje la
 * app en blanco: en una herramienta de emergencias, el 123 y la navegación
 * deben seguir visibles. React solo permite este mecanismo con componentes de clase.
 * Para reintentar tras navegar, el padre le da una `key` distinta por ruta.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de interfaz', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <section role="alert" className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
          <IconAlert className="size-6" />
        </span>
        <h1 className="mt-3 text-xl font-bold">Algo falló al mostrar esta pantalla</h1>
        <p className="mt-1 text-slate-600">
          Sus datos guardados siguen a salvo. Puede volver al inicio o recargar la página.
        </p>
        <p className="mt-3 font-semibold text-red-800">En emergencia llame al 123.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a href="/" className="rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-white">
            Ir al inicio
          </a>
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl border border-slate-300 px-4 py-2.5 font-semibold"
          >
            Recargar
          </button>
        </div>
      </section>
    )
  }
}
