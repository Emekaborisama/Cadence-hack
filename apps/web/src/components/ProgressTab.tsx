import { Button } from '@heroui/react';
import { computeTrend } from '@cadence/shared';
import type { CheckInResponse, GlucoseReading, GlucoseTarget } from '@cadence/shared';

const MIN = 3;
const MAX = 13;
const pct = (v: number) => Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN)));
const IN = '#16a34a'; // in range → green (healthy)
const OUT = '#e0714f'; // out of range → warm clay

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
  const arrow = trend.direction === 'down' ? '↓' : trend.direction === 'up' ? '↑' : '→';
  const inRange =
    trend.latest != null && trend.latest >= target.low && trend.latest <= target.high;

  return (
    <div className="px-5 pb-8 pt-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <header>
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          At-home monitoring
        </div>
        <h1
          className="mt-1 text-[28px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Your glucose
        </h1>
      </header>

      {/* hero read-out — big number, Oura-style */}
      <div className="mono-card mt-4 rounded-3xl p-5">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[52px] font-semibold leading-none text-ink2"
              style={{ fontFamily: 'var(--font-sora), sans-serif' }}
            >
              {trend.latest ?? '–'}
            </span>
            <span className="text-[14px] text-slate">mmol/L</span>
          </div>
          <span
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold"
            style={{ background: inRange ? '#e7f6ec' : '#fbeadf', color: inRange ? IN : OUT }}
          >
            {arrow} {trend.inRangePct}% in range
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-snug text-ink2/80">{trend.readOut}</p>
      </div>

      {/* chart */}
      <div className="mono-card mt-4 rounded-3xl p-5">
        <div className="mb-2 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wide text-slate">
          <span>Morning readings</span>
          <span>
            Target {target.low}–{target.high}
          </span>
        </div>
        <div className="relative h-40">
          {/* target band */}
          <div
            className="absolute inset-x-0 rounded-md"
            style={{
              background: '#eaf6ee',
              bottom: `${pct(target.low) * 100}%`,
              top: `${(1 - pct(target.high)) * 100}%`,
            }}
          />
          <div className="relative flex h-full items-stretch gap-2">
            {recent.map((r) => {
              const good = r.value >= target.low && r.value <= target.high;
              return (
                <div key={r.id} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[10.5px] font-semibold text-slate">{r.value}</span>
                  <div
                    className="w-full rounded-t-lg"
                    style={{
                      height: `${Math.max(6, pct(r.value) * 88)}%`,
                      background: good ? IN : OUT,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Button
        onPress={onLog}
        className="mt-4 w-full rounded-2xl bg-mint py-7 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
      >
        Log a reading
      </Button>

      {/* care-team response after a flagged reading */}
      {glucoseResult ? (
        <div
          className={`mt-4 space-y-2 rounded-3xl border p-4 ${
            glucoseResult.escalate
              ? 'border-[rgba(224,113,79,0.35)] bg-[#fbeadf]'
              : 'border-[rgba(22,163,74,0.3)] bg-[#e7f6ec]'
          }`}
        >
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink2/70">
            {glucoseResult.escalate ? 'Flagged to your care team' : 'Logged'}
          </div>
          <p className="text-[14.5px] leading-snug text-ink2/80">{glucoseResult.message}</p>
          <ul className="space-y-1.5 pt-0.5">
            {glucoseResult.protocolSteps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-snug text-ink2/80">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: IN }} />
                {s}
              </li>
            ))}
          </ul>
          {glucoseResult.escalate && glucoseResult.escalationNote ? (
            <p className="rounded-xl bg-white/70 p-2.5 text-[13px] font-medium" style={{ color: OUT }}>
              {glucoseResult.escalationNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
