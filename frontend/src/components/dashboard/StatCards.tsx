import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { UavMark } from "../icons";
import { Panel } from "../ui";

const cards = [
  {
    label: "Persons Detected",
    value: "12",
    delta: "+3",
    deltaClass: "bg-emerald-50 text-emerald-600",
    hint: "in current session",
    iconWrap: "bg-blue-50 text-blue-500",
    icon: "people" as const,
  },
  {
    label: "Active Alerts",
    value: "3",
    delta: "+1",
    deltaClass: "bg-red-50 text-red-500",
    hint: "require attention",
    iconWrap: "bg-rose-50 text-red-500",
    icon: "alert" as const,
  },
  {
    label: "Drones Online",
    value: "1",
    delta: "",
    deltaClass: "",
    hint: "of 1 deployed",
    iconWrap: "bg-emerald-50 text-emerald-500",
    icon: "drone" as const,
  },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Panel key={card.label} className="px-5 py-4">
          <div className="flex items-center gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${card.iconWrap}`}>
              {card.icon === "people" && <Users className="h-6 w-6" />}
              {card.icon === "alert" && <AlertTriangle className="h-6 w-6" />}
              {card.icon === "drone" && <UavMark className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[32px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </span>
                {card.delta && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${card.deltaClass}`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {card.delta}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-400">{card.hint}</div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
