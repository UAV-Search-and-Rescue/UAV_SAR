import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginGate } from './components/LoginGate'
import { useAuth } from './context/AuthContext'
import { MissionPlaybackProvider } from './context/MissionPlaybackContext'
import { AppShell } from './layout/AppShell'
import { AlertsPage } from './pages/AlertsPage'
import { MetricsPage } from './pages/MetricsPage'
import { MissionPage } from './pages/MissionPage'
import { StreamPage } from './pages/StreamPage'

export default function App() {
  const { operator } = useAuth()

  if (!operator) {
    return <LoginGate />
  }

  return (
    <MissionPlaybackProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/mission" replace />} />
          <Route path="/mission" element={<MissionPage />} />
          <Route path="/stream" element={<StreamPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="*" element={<Navigate to="/mission" replace />} />
        </Route>
      </Routes>
    </MissionPlaybackProvider>
  )
}
