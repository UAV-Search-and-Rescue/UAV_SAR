import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { AlertsPage } from './pages/AlertsPage'
import { MetricsPage } from './pages/MetricsPage'
import { MissionPage } from './pages/MissionPage'
import { StreamPage } from './pages/StreamPage'

export default function App() {
  return (
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
  )
}
