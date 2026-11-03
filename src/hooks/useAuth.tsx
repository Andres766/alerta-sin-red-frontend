import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { UserAccount } from '../domain/types'
import { adminService } from '../services'

interface Session {
  token: string
  user: UserAccount
  expiresAt: number
}

interface AuthState {
  session: Session | null
  /** Motivo del último cierre de sesión (p. ej. token vencido o cuenta desactivada). */
  notice: string | null
  login: (email: string, password: string) => Promise<void>
  logout: (reason?: string) => void
  /** Reemplaza el token de la sesión actual (p. ej. tras cambiar la contraseña). */
  replaceToken: (token: string, expiresIn: number) => void
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * El token vive SOLO en memoria (estado de React): no se guarda en
 * localStorage, donde cualquier script inyectado (XSS) podría leerlo.
 * Contrapartida aceptada: al recargar la página hay que volver a entrar.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    const t = await adminService.login(email, password)
    // /auth/me confirma la sesión y devuelve quién es y su rol vigente.
    const user = await adminService.me(t.access_token)
    setNotice(null)
    setSession({ token: t.access_token, user, expiresAt: Date.now() + t.expires_in * 1000 })
  }, [])

  const replaceToken = useCallback((token: string, expiresIn: number) => {
    setSession((current) =>
      current ? { ...current, token, expiresAt: Date.now() + expiresIn * 1000 } : current,
    )
  }, [])

  const logout = useCallback((reason?: string) => {
    setSession(null)
    setNotice(reason ?? null)
  }, [])

  // Cierre automático al expirar el token.
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(
      () => logout('Su sesión expiró por seguridad. Ingrese de nuevo.'),
      Math.max(session.expiresAt - Date.now(), 0),
    )
    return () => clearTimeout(timer)
  }, [session, logout])

  return (
    <AuthContext.Provider value={{ session, notice, login, logout, replaceToken }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
