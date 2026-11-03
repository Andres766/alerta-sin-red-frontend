import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { preferences } from '../services'

interface FavoriteState {
  favoriteId: string | null
  setFavorite: (zoneId: string | null) => Promise<void>
}

const FavoriteContext = createContext<FavoriteState | null>(null)

/** "Mi zona": la zona que la persona fijó para verla primero (guardada en el dispositivo). */
export function FavoriteZoneProvider({ children }: { children: ReactNode }) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    void preferences.favoriteZoneId().then(setFavoriteId)
  }, [])

  const setFavorite = useCallback(async (zoneId: string | null) => {
    await preferences.setFavoriteZoneId(zoneId)
    setFavoriteId(zoneId)
  }, [])

  return (
    <FavoriteContext.Provider value={{ favoriteId, setFavorite }}>{children}</FavoriteContext.Provider>
  )
}

export function useFavoriteZone(): FavoriteState {
  const context = useContext(FavoriteContext)
  if (!context) throw new Error('useFavoriteZone debe usarse dentro de <FavoriteZoneProvider>')
  return context
}
