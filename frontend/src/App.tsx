import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LiveSessionProvider } from "./context/LiveSessionContext";
import { AlertsPage } from "./pages/AlertsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DetectionPage } from "./pages/DetectionPage";
import { LocalizationPage } from "./pages/LocalizationPage";
import { ResultsPage } from "./pages/ResultsPage";

export function App() {
  return (
    <LiveSessionProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/detection" element={<DetectionPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:resultId" element={<ResultsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/alerts/:alertId" element={<AlertsPage />} />
          <Route path="/localization" element={<LocalizationPage />} />
          <Route path="/localization/:locationId" element={<LocalizationPage />} />
          <Route path="/models" element={<Navigate to="/" replace />} />
          <Route path="/system" element={<Navigate to="/" replace />} />
          <Route path="/demo" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </LiveSessionProvider>
  );
}
