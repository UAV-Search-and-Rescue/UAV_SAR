import { useState, type FormEvent, type ReactNode } from "react";
import { useUi } from "../../context/UiContext";
import { Dialog } from "../ui";
import { UavMark } from "../icons";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, setSidebarOpen, signedOut, setSignedOut, logoutOpen, setLogoutOpen, pushToast, toasts, dismissToast } =
    useUi();

  return (
    <div className="flex h-screen overflow-hidden font-sans antialiased" style={{ background: "var(--sar-bg)", color: "var(--sar-text-1)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: "var(--sar-teal)", color: "var(--sar-text-inv)" }}
      >
        Skip to main content
      </a>

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
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main id="main-content" className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>
            <BottomNav />
          </div>
        </>
      )}

      {logoutOpen && (
        <Dialog title="Sign out" onClose={() => setLogoutOpen(false)}>
          <p className="text-sm" style={{ color: "var(--sar-text-2)" }}>Sign out of the UAV SAR operator console?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              className="h-9 rounded-lg px-4 text-sm font-medium"
              style={{ border: "1px solid var(--sar-border-2)", color: "var(--sar-text-2)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setLogoutOpen(false); setSignedOut(true); }}
              className="h-9 rounded-lg px-4 text-sm font-semibold text-white"
              style={{ background: "var(--sar-red)" }}
            >
              Sign out
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
            className="pointer-events-auto rounded-xl px-4 py-3 text-left text-sm shadow-lg"
            style={{ background: "var(--sar-surface-3)", border: "1px solid var(--sar-border-2)", color: "var(--sar-text-1)" }}
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
    <div className="grid min-h-screen w-full place-items-center px-4" style={{ background: "var(--sar-bg)" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border)", boxShadow: "var(--shadow-popup)" }}
      >
        <div className="flex items-center gap-2.5">
          <UavMark className="h-9 w-9" style={{ color: "var(--sar-teal)" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--sar-text-1)" }}>UAV SAR</div>
            <div className="text-xs" style={{ color: "var(--sar-text-2)" }}>Search &amp; Rescue</div>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-semibold" style={{ color: "var(--sar-text-1)" }}>Operator sign in</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>Enter a password to continue.</p>
        <label className="mt-4 block text-sm" style={{ color: "var(--sar-text-2)" }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--sar-surface-2)", border: "1px solid var(--sar-border-2)", color: "var(--sar-text-1)" }}
            autoFocus
          />
        </label>
        {error && <p className="mt-2 text-sm" style={{ color: "var(--sar-red)" }}>{error}</p>}
        <button
          type="submit"
          className="mt-4 h-10 w-full rounded-lg text-sm font-semibold hover:opacity-90"
          style={{ background: "var(--sar-teal)", color: "var(--sar-text-inv)" }}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
