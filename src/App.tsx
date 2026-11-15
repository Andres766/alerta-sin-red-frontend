import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './hooks/useAuth'
import { FavoriteZoneProvider } from './hooks/useFavoriteZone'
import { SnapshotProvider } from './hooks/useSnapshot'
import { ThemeProvider } from './hooks/useTheme'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SubscribePage } from './pages/SubscribePage'
import { ZonePage } from './pages/ZonePage'
import { I18nProvider } from './i18n/I18nProvider'

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
    <BrowserRouter>
      <SnapshotProvider>
        <FavoriteZoneProvider>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="zona/:zoneId" element={<ZonePage />} />
                <Route path="suscribirme" element={<SubscribePage />} />
                <Route path="operador" element={<AdminPage />} />
                <Route path="como-funciona" element={<HowItWorksPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </FavoriteZoneProvider>
      </SnapshotProvider>
    </BrowserRouter>
    </I18nProvider>
    </ThemeProvider>
  )
}
