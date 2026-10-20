import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  noticesOpen: boolean;
  setNoticesOpen: (open: boolean) => void;
  noticesRead: boolean;
  markNoticesRead: () => void;
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

export function UiProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [noticesRead, setNoticesRead] = useState(false);
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

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark") setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const value = useMemo<UiContextValue>(
    () => ({
      dark,
      toggleDark: () => setDark((current) => !current),
      sidebarOpen,
      setSidebarOpen,
      query,
      setQuery,
      noticesOpen,
      setNoticesOpen,
      noticesRead,
      markNoticesRead: () => {
        setNoticesRead(true);
        setNoticesOpen(false);
        pushToast("Alerts marked as read");
      },
      signedOut,
      setSignedOut,
      logoutOpen,
      setLogoutOpen,
      toasts,
      pushToast,
      dismissToast,
    }),
    [dark, dismissToast, logoutOpen, noticesOpen, noticesRead, pushToast, query, sidebarOpen, signedOut, toasts],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) throw new Error("useUi must be used within UiProvider");
  return context;
}
