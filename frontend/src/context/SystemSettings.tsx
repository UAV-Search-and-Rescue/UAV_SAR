import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ModelOption } from "../data/detection";

export type SystemSettings = {
  threshold: number;
  modelId: ModelOption["id"];
  imageSize: string;
  environment: "Development" | "Staging" | "Production";
};

type SystemSettingsValue = {
  settings: SystemSettings;
  saveSettings: (next: SystemSettings) => void;
};

const defaults: SystemSettings = {
  threshold: 0.5,
  modelId: "e0",
  imageSize: "640",
  environment: "Development",
};

const SystemSettingsContext = createContext<SystemSettingsValue | null>(null);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaults);
  const value = useMemo(() => ({ settings, saveSettings: setSettings }), [settings]);
  return <SystemSettingsContext.Provider value={value}>{children}</SystemSettingsContext.Provider>;
}

export function useSystemSettings() {
  const value = useContext(SystemSettingsContext);
  if (!value) throw new Error("useSystemSettings must be used within SystemSettingsProvider");
  return value;
}
