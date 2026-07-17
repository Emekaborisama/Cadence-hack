"use client";

import { computeTrend } from "@/lib/glucose";
import type {
  CheckInResponse,
  GlucoseReading,
  GlucoseTarget,
} from "@/lib/types";

// Chart domain (mmol/L) — a fixed window so bars and target lines line up.
const MIN = 3;
const MAX = 13;
const pct = (v: number) => Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)));

export default function ProgressTab({
  readings,
  target,
  glucoseResult,
  onLog,
}: {
  readings: GlucoseReading[];
  target: GlucoseTarget;
  glucoseResult: CheckInResponse | null;
  onLog: () => void;
}) {
  const trend = computeTrend(readings, target);
  const recent = readings.slice(-8);
  const arrow =
    trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→";

  return (
    <div className="px-5 pb-6 pt-5">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
          At-home monitoring
        </div>
        <h1 className="mt-1 font-serif text-2xl font-medium text-ink">
          Your glucose
        </h1>
      </header>

      {/* plain-language read-out — complex data into simple advice */}
      <div className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-serif text-3xl font-medium text-ink">
              {trend.latest ?? "–"}
            </span>
            <span className="ml-1 text-[13px] text-muted">mmol/L latest</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-care-wash px-2.5 py-1 text-[12px] font-semibold text-care-strong">
            <span>{arrow}</span>
            {trend.inRangePct}% in range
          </div>
        </div>
        <p className="mt-2 text-[14px] leading-snug text-ink/75">
          {trend.readOut}
        </p>
      </div>

      {/* bar chart with target band */}
      <div className="mt-4 glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span>Morning readings</span>
          <span>
            Target {target.low}–{target.high}
          </span>
        </div>
        <div className="relative h-36">
          {/* target band */}
          <div
            className="absolute inset-x-0 rounded-sm bg-care-wash"
            style={{
              bottom: `${pct(target.low) * 100}%`,
              top: `${(1 - pct(target.high)) * 100}%`,
            }}
          />
          {/* bars */}
          <div className="relative flex h-full items-stretch gap-1.5">
            {recent.map((r) => {
              const inRange = r.value >= target.low && r.value <= target.high;
              return (
                <div
                  key={r.id}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] font-semibold text-muted">
                    {r.value}
                  </span>
                  <div
                    className={`w-full rounded-t ${
                      inRange ? "bg-care" : "bg-clay"
                    }`}
                    style={{ height: `${Math.max(6, pct(r.value) * 88)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={onLog}
        className="mt-4 w-full rounded-xl bg-care px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-care-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care"
      >
        Log a reading
      </button>

      {/* care-team response after a flagged reading */}
      {glucoseResult ? (
        <div
          className={`mt-4 space-y-2 rounded-2xl border p-4 ${
            glucoseResult.escalate
              ? "border-clay/25 bg-clay-wash"
              : "border-care/25 bg-care-wash"
          }`}
        >
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-care-strong">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-care" />
            {glucoseResult.escalate ? "Flagged to your care team" : "Logged"}
          </h2>
          <p className="font-serif text-[15px] italic leading-snug text-ink/80">
            {glucoseResult.message}
          </p>
          <ul className="space-y-1.5 pt-0.5">
            {glucoseResult.protocolSteps.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 text-[14px] leading-snug text-ink/80"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-care" />
                {s}
              </li>
            ))}
          </ul>
          {glucoseResult.escalate && glucoseResult.escalationNote ? (
            <p className="rounded-lg bg-white/70 p-2.5 text-[13px] font-medium text-clay">
              {glucoseResult.escalationNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
