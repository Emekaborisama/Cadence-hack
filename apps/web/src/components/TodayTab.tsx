import { useState } from 'react';
import { Button } from '@heroui/react';
import type { CheckInResponse, DailyTask, HandoffPlan } from '@cadence/shared';
import { buildDailyTasks } from '@cadence/shared';
import { pToggleTask } from '../api.js';
import type { PatientView } from '../api.js';
import { downloadScheduleIcs } from '../lib/calendar.js';

// Visuals per task kind — each row led by its photographic object (monogram move).
function taskVisual(t: DailyTask): { obj: string; tint: string; guide?: string } {
  if (t.kind === 'medication') {
    return t.glp1
      ? { obj: 'semaglutide-pen.png', tint: '#e4f6f2', guide: 'semaglutide' }
      : { obj: 'metformin-pill.png', tint: '#e8f1ff' };
  }
  if (t.kind === 'monitoring') return { obj: 'bp-cuff.png', tint: '#f0ecfb', guide: 'bp' };
  if (t.kind === 'movement') return { obj: 'walking-shoe.png', tint: '#e9f6ea' };
  if (t.kind === 'diet') return { obj: 'water-glass.png', tint: '#e6f2fd' };
  return { obj: 'plate-veg.png', tint: '#fdeee0' };
}

const delay = (i: number) => ({ animationDelay: `${i * 70}ms` });

export default function TodayTab({
  patientId,
  plan,
  streakDays,
  tasksDone,
  checkInResponse,
  onCheckIn,
  onShowGuide,
  onView,
  onSignOut,
}: {
  patientId: string;
  plan: HandoffPlan;
  streakDays: number;
  tasksDone: string[];
  checkInResponse: CheckInResponse | null;
  onCheckIn: () => void;
  onShowGuide: (key: string) => void;
  onView: (view: PatientView) => void;
  onSignOut: () => void;
}) {
  // The checklist IS the plan: derived from what the clinician sent, so the
  // Plan tab's actions and the streak checklist can never drift apart.
  const tasks = buildDailyTasks(plan);

  // Server-tracked completions: survive refresh, other devices, and restarts.
  // Optimistic local echo so taps feel instant while the action round-trips.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const done = new Set(tasksDone);
  for (const id of pending) {
    if (done.has(id)) done.delete(id);
    else done.add(id);
  }
  const toggle = (id: string) => {
    setPending((prev) => new Set(prev).add(id));
    pToggleTask(patientId, id)
      .then(onView)
      .finally(() =>
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      );
  };
  const completed = tasks.filter((t) => done.has(t.id)).length;
  const pct = tasks.length ? completed / tasks.length : 0;

  return (
    <div
      className="px-5 pb-8 pt-4 text-ink2"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* greeting */}
      <header className="reveal flex items-start justify-between" style={delay(0)}>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Day {streakDays} of your plan ·{' '}
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </div>
          <h1
            className="mt-1 text-[30px] font-semibold leading-[1.05] text-ink2"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          >
            Good morning,
            <br />
            {plan.patientName}
          </h1>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Sign out of this record?')) onSignOut();
          }}
          title="Sign out"
          className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-mint-strong shadow-[0_6px_16px_-8px_rgba(23,26,31,0.3)] active:scale-95"
        >
          {plan.patientName.slice(0, 1)}
        </button>
      </header>

      {/* streak / consistency */}
      <div className="reveal mono-card mt-5 flex items-center gap-4 rounded-3xl p-4" style={delay(1)}>
        <StreakRing pct={pct} />
        <div className="flex-1">
          <div
            className="text-[19px] font-semibold text-ink2"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          >
            {streakDays}-day streak
          </div>
          <div className="text-[13.5px] text-slate">
            {completed} of {tasks.length} done today · keep it going
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < streakDays ? 'bg-mint' : 'bg-hair'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* week-2 check-in nudge */}
      <div
        className="reveal mt-4 overflow-hidden rounded-3xl border border-[rgba(18,184,134,0.22)] bg-mint-wash p-4"
        style={delay(2)}
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-mint-strong">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint/50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          Week 2 check-in
        </div>
        <p
          className="mt-2 text-[18px] font-medium leading-snug text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          You&rsquo;re two weeks into semaglutide. How are you feeling?
        </p>
        <Button
          onPress={onCheckIn}
          className="mt-3 w-full rounded-2xl bg-mint py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
        >
          Check in with my care team
        </Button>
      </div>

      {/* care-team response */}
      {checkInResponse ? (
        <div
          className={`reveal mt-4 space-y-2 rounded-3xl border p-4 ${
            checkInResponse.escalate
              ? 'border-[rgba(180,71,46,0.25)] bg-blush-wash'
              : 'border-[rgba(18,184,134,0.22)] bg-mint-wash'
          }`}
        >
          <div className="text-[12px] font-semibold uppercase tracking-wide text-mint-strong">
            From your care team
          </div>
          <p className="text-[14.5px] leading-snug text-ink2/80">{checkInResponse.message}</p>
          <ul className="space-y-1.5 pt-0.5">
            {checkInResponse.protocolSteps.map((s, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-snug text-ink2/80">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint" />
                {s}
              </li>
            ))}
          </ul>
          {checkInResponse.escalate && checkInResponse.escalationNote ? (
            <p className="rounded-xl bg-white/70 p-2.5 text-[13px] font-medium text-blush">
              {checkInResponse.escalationNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* today's plan, object-led rows */}
      <section className="reveal mt-6" style={delay(3)}>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-[17px] font-semibold text-ink2"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          >
            Today&rsquo;s plan
          </h2>
          <button
            onClick={() => downloadScheduleIcs(plan.patientName)}
            className="inline-flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1.5 text-[12px] font-semibold text-mint-strong"
          >
            <span aria-hidden>＋</span> Add to calendar
          </button>
        </div>
        <ul className="space-y-2.5">
          {tasks.map((t) => {
            const isDone = done.has(t.id);
            const v = taskVisual(t);
            return (
              <li key={t.id}>
                <div className="mono-card rounded-3xl p-2.5">
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => toggle(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-3.5 text-left transition active:scale-[0.99]"
                    >
                      {/* photographic 3D object on a soft colored tile so it pops */}
                      <span
                        className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-[20px]"
                        style={{ background: v.tint }}
                      >
                        <img
                          src={`/objects/${v.obj}`}
                          alt=""
                          className={`h-[88px] w-[88px] object-contain mix-blend-multiply transition ${isDone ? 'opacity-45 grayscale' : ''}`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[15.5px] font-semibold ${isDone ? 'text-slate line-through' : 'text-ink2'}`}
                        >
                          {t.title}
                        </span>
                        <span className="block truncate text-[13px] text-slate">{t.detail}</span>
                        <span className="mt-1 inline-block rounded-full bg-canvas px-2 py-0.5 text-[11.5px] font-semibold text-slate">
                          {t.when}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => toggle(t.id)}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold ${
                        isDone ? 'border-mint bg-mint text-ink2' : 'border-hair text-transparent'
                      }`}
                      aria-label="mark done"
                    >
                      ✓
                    </button>
                  </div>
                  {v.guide ? (
                    <button
                      onClick={() => onShowGuide(v.guide!)}
                      className="ml-[86px] mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1.5 text-[12.5px] font-semibold text-mint-strong"
                    >
                      <span className="text-[10px]">▶</span> Show me how
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// Soft completion ring for the streak card.
function StreakRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-hair)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span
        className="absolute text-[15px] font-bold text-ink2"
        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
      >
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
