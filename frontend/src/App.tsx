import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AlertsPage } from "./pages/AlertsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DetectionPage } from "./pages/DetectionPage";
import { LocalizationPage } from "./pages/LocalizationPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SystemPage } from "./pages/SystemPage";

export function App() {
  return (
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
        <Route path="/models" element={<Navigate to="/system" replace />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
