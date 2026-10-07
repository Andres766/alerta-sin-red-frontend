import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { adminService } from '../services'

interface Session {
  token: string
  role: string
  expiresAt: number
}

interface AuthState {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * El token vive SOLO en memoria (estado de React): no se guarda en
 * localStorage, donde cualquier script inyectado (XSS) podría leerlo.
 * Contrapartida aceptada: al recargar la página hay que volver a entrar.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    const t = await adminService.login(email, password)
    setSession({ token: t.access_token, role: t.role, expiresAt: Date.now() + t.expires_in * 1000 })
  }, [])

  const logout = useCallback(() => setSession(null), [])

  // Cierre automático al expirar el token.
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(logout, Math.max(session.expiresAt - Date.now(), 0))
    return () => clearTimeout(timer)
  }, [session, logout])

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
