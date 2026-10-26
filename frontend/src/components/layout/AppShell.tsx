import { useState, type FormEvent, type ReactNode } from "react";
import { useUi } from "../../context/UiContext";
import { Dialog } from "../ui";
import { UavMark } from "../icons";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, setSidebarOpen, signedOut, setSignedOut, logoutOpen, setLogoutOpen, pushToast, toasts, dismissToast } =
    useUi();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)] font-sans text-[var(--color-text)] antialiased">
      {signedOut ? (
        <LoginScreen
          onSignIn={() => {
            setSignedOut(false);
            pushToast("Signed in");
          }}
        />
      ) : (
        <>
          {sidebarOpen && (
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </>
      )}
      {logoutOpen && (
        <Dialog title="Sign out" onClose={() => setLogoutOpen(false)}>
          <p className="text-sm text-slate-500">Sign out of the UAV SAR operator console?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setLogoutOpen(false);
                setSignedOut(true);
              }}
              className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              Logout
            </button>
          </div>
        </Dialog>
      )}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-72 flex-col gap-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto rounded-xl bg-slate-900 px-4 py-3 text-left text-sm text-white shadow-lg"
          >
            {toast.message}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password.trim().length < 4) {
      setError("Use at least 4 characters for this demo sign-in.");
      return;
    }
    onSignIn();
  }

  return (
    <div className="grid min-h-screen w-full place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[#e6edf5] bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <UavMark className="h-9 w-9 text-blue-500" />
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">UAV SAR</div>
            <div className="text-xs text-slate-400">Search &amp; Rescue</div>
          </div>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-800 dark:text-slate-50">Operator sign in</h1>
        <p className="mt-1 text-sm text-slate-400">Enter a password to continue.</p>
        <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950"
            autoFocus
          />
        </label>
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        <button type="submit" className="mt-4 h-10 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white">
          Sign in
        </button>
      </form>
    </div>
  );
}
