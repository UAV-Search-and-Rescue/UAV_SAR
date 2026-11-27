import { AlertTriangle, Users } from "lucide-react";
import { Panel } from "../ui";

export function StatCards({
  personsDetected = 0,
  activeAlerts = 0,
}: {
  personsDetected?: number;
  activeAlerts?: number;
}) {
  const cards = [
    {
      label: "Persons Detected",
      value: String(personsDetected),
      hint: "in current session",
      accentClass: "stat-card-blue",
      iconBg: "rgba(59,130,246,0.12)",
      iconColor: "var(--sar-blue)",
      icon: "people" as const,
    },
    {
      label: "Active Alerts",
      value: String(activeAlerts),
      hint: "require attention",
      accentClass: "stat-card-red",
      iconBg: "rgba(239,68,68,0.12)",
      iconColor: "var(--sar-red)",
      icon: "alert" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {cards.map((card) => (
        <Panel key={card.label} className={`stat-card-accent-top ${card.accentClass} px-4 py-4`}>
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
              style={{ background: card.iconBg, color: card.iconColor }}
              aria-hidden="true"
            >
              {card.icon === "people" && <Users className="h-5 w-5" />}
              {card.icon === "alert" && <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "var(--sar-text-3)" }}>
                {card.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  className="text-[30px] font-bold leading-none tracking-tight"
                  style={{ color: "var(--sar-text-1)" }}
                >
                  {card.value}
                </span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--sar-text-3)" }}>{card.hint}</div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
