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
      className={cn(
        "rounded-2xl border border-[#e6edf5] bg-white shadow-[0_8px_24px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-100">
        {icon}
        <h2 className="text-[15px] font-semibold">{title}</h2>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Not found</h2>
      <p className="mt-1 text-sm text-slate-500">
        No {kind} matches <span className="font-medium text-slate-700 dark:text-slate-200">{id}</span>.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
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
      className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      View All
    </button>
  );
}
