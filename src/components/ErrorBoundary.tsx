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
      <section role="alert" className="rounded-lg border border-negative-ink/30 bg-surface p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-lg bg-negative-bg text-negative-ink">
          <IconAlert className="size-6" />
        </span>
        <h1 className="mt-3 text-xl font-bold">Algo falló al mostrar esta pantalla</h1>
        <p className="mt-1 text-muted">
          Sus datos guardados siguen a salvo. Puede volver al inicio o recargar la página.
        </p>
        <p className="mt-3 font-semibold text-negative-ink">En emergencia llame al 123.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a href="/" className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary">
            Ir al inicio
          </a>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-control px-4 py-2.5 font-semibold"
          >
            Recargar
          </button>
        </div>
      </section>
    )
  }
}
