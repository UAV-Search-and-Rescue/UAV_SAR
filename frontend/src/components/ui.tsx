import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("sar-panel", className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-header flex-wrap justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2" style={{ color: "var(--sar-text-1)" }}>
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-5"
        style={{ background: "var(--sar-surface)", border: "1px solid var(--sar-border-2)", boxShadow: "var(--shadow-popup)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--sar-text-1)" }}>{title}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ color: "var(--sar-text-2)" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--sar-surface-2)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MissingRecord({
  kind,
  id,
  onBack,
}: {
  kind: "result" | "alert" | "location";
  id: string;
  onBack: () => void;
}) {
  const list = kind === "result" ? "results" : kind === "alert" ? "alerts" : "locations";
  return (
    <div className="p-5">
      <h2 className="text-base font-semibold" style={{ color: "var(--sar-text-1)" }}>Not found</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--sar-text-2)" }}>
        No {kind} matches <span className="font-medium" style={{ color: "var(--sar-text-1)" }}>{id}</span>.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 h-9 rounded-lg px-4 text-sm font-semibold text-white"
        style={{ background: "var(--sar-blue)" }}
      >
        Back to {list}
      </button>
    </div>
  );
}

export function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 text-xs font-semibold"
      style={{ color: "var(--sar-teal)" }}
      onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
    >
      View All →
    </button>
  );
}

/** Reusable confidence badge */
export function ConfBadge({ confidence }: { confidence: number }) {
  const cls = confidence >= 0.8 ? "conf-high" : confidence >= 0.5 ? "conf-medium" : "conf-low";
  return (
    <span className={`badge-base ${cls}`}>
      {(confidence * 100).toFixed(0)}%
    </span>
  );
}

/** Empty state component */
export function EmptyState({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <p className="text-sm" style={{ color: "var(--sar-text-2)" }}>{message}</p>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-medium"
          style={{ color: "var(--sar-teal)" }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
