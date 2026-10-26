import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string };

type UiContextValue = {
  dark: boolean;
  toggleDark: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  signedOut: boolean;
  setSignedOut: (signedOut: boolean) => void;
  logoutOpen: boolean;
  setLogoutOpen: (open: boolean) => void;
  toasts: Toast[];
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
};

const UiContext = createContext<UiContextValue | null>(null);
const THEME_KEY = "uav-sar-dashboard-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return false;

  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(getInitialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current.slice(-3), { id, message }]);
      window.setTimeout(() => dismissToast(id), 2800);
    },
    [dismissToast],
  );

  useLayoutEffect(() => {
    const theme = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [dark]);

  const value = useMemo<UiContextValue>(
    () => ({
      dark,
      toggleDark: () => setDark((current) => !current),
      sidebarOpen,
      setSidebarOpen,
      query,
      setQuery,
      signedOut,
      setSignedOut,
      logoutOpen,
      setLogoutOpen,
      toasts,
      pushToast,
      dismissToast,
    }),
    [dark, dismissToast, logoutOpen, pushToast, query, sidebarOpen, signedOut, toasts],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) throw new Error("useUi must be used within UiProvider");
  return context;
}
