"use client";

export type PatientTab = "today" | "plan" | "progress";

// Simple stroke icons (inline SVG, no dependency).
function Icon({ id, className }: { id: PatientTab; className?: string }) {
  const common = {
    className,
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (id === "today") {
    // sun — the daily rhythm
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (id === "plan") {
    // clipboard-check — the care plan
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="17" rx="2.5" />
        <path d="M9 4a3 3 0 0 1 6 0" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    );
  }
  // progress — trending line
  return (
    <svg {...common}>
      <path d="M3 17l5-5 3 3 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

const TABS: { id: PatientTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "plan", label: "Plan" },
  { id: "progress", label: "Progress" },
];

// Bottom navigation for the patient surface — icon + label per focused screen.
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
    <nav className="mono-nav flex shrink-0 items-stretch pb-1">
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-2xl transition-colors ${
                active ? "bg-mint-wash text-mint-strong" : "text-slate"
              }`}
            >
              <Icon id={t.id} className={active ? "text-mint-strong" : "text-slate"} />
            </span>
            <span
              className={`text-[11.5px] font-semibold transition-colors ${
                active ? "text-mint-strong" : "text-slate"
              }`}
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {t.label}
            </span>
            {alert === t.id && !active ? (
              <span className="absolute right-[26%] top-1.5 h-1.5 w-1.5 rounded-full bg-blush" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
