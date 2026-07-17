"use client";

export type PatientTab = "today" | "plan" | "progress";

const TABS: { id: PatientTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "plan", label: "Plan" },
  { id: "progress", label: "Progress" },
];

// Bottom navigation for the patient surface. Each tab is a focused screen so
// the demo reads as three distinct surfaces, not one long scroll.
export default function PatientTabBar({
  tab,
  onChange,
  alert,
}: {
  tab: PatientTab;
  onChange: (t: PatientTab) => void;
  alert?: PatientTab | null;
}) {
  return (
    <nav className="glass-nav flex shrink-0 items-stretch border-t border-white/50">
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <span
              className={`h-1 w-1 rounded-full transition-colors ${
                active ? "bg-care" : "bg-transparent"
              }`}
            />
            <span
              className={`text-[13px] font-semibold transition-colors ${
                active ? "text-care-strong" : "text-muted"
              }`}
            >
              {t.label}
            </span>
            {alert === t.id && !active ? (
              <span className="absolute right-[28%] top-1.5 h-1.5 w-1.5 rounded-full bg-clay" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
