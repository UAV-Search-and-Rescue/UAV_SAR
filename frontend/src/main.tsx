import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { SystemSettingsProvider } from "./context/SystemSettings";
import { UiProvider } from "./context/UiContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <SystemSettingsProvider>
          <App />
        </SystemSettingsProvider>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>,
);
