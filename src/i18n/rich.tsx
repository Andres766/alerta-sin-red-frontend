import { Fragment, type ReactNode } from 'react'

/**
 * Inserta elementos de React en un texto traducido: rich('Actualizado {ago}', { ago: <RelativeTime/> }).
 * Así el orden de las palabras lo decide cada idioma y no el componente.
 */
export function rich(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{name !== undefined && name in values ? values[name] : part}</Fragment>
  })
}
