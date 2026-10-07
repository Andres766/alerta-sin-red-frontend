import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './hooks/useAuth'
import { SnapshotProvider } from './hooks/useSnapshot'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { SubscribePage } from './pages/SubscribePage'
import { ZonePage } from './pages/ZonePage'

export default function App() {
  return (
    <BrowserRouter>
      <SnapshotProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="zona/:zoneId" element={<ZonePage />} />
              <Route path="suscribirme" element={<SubscribePage />} />
              <Route path="operador" element={<AdminPage />} />
              <Route
                path="*"
                element={<p>Página no encontrada. <Link className="underline" to="/">Inicio</Link></p>}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </SnapshotProvider>
    </BrowserRouter>
  )
}
