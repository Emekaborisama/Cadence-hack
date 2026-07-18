import { useState } from 'react';
import { Button } from '@heroui/react';
import type { CheckInResponse, HandoffPlan } from '@cadence/shared';

// Today's actions, each led by its real photographic object (monogram move).
type Task = {
  id: string;
  obj: string;
  title: string;
  detail: string;
  when: string;
  tint: string; // soft colored tile so the near-white object pops
  guide?: string; // key into GUIDES for a "show me how" walkthrough
};

const TASKS: Task[] = [
  { id: 'metformin-am', obj: 'metformin-pill.png', title: 'Metformin 1000mg', detail: 'With breakfast', when: '8:00', tint: '#e8f1ff' },
  { id: 'semaglutide', obj: 'semaglutide-pen.png', title: 'Semaglutide injection', detail: 'Weekly · your day', when: 'Sun', tint: '#e4f6f2', guide: 'semaglutide' },
  { id: 'bp', obj: 'bp-cuff.png', title: 'Blood-pressure check', detail: 'Mornings are best', when: '9:00', tint: '#f0ecfb', guide: 'bp' },
  { id: 'walk', obj: 'walking-shoe.png', title: 'Evening walk', detail: '20 min after your meal', when: '19:30', tint: '#e9f6ea' },
  { id: 'meal', obj: 'plate-veg.png', title: 'Log a meal', detail: 'Snap it, protein first', when: 'Anytime', tint: '#fdeee0' },
  { id: 'water', obj: 'water-glass.png', title: 'Stay hydrated', detail: 'Keep sipping through the day', when: 'Goal', tint: '#e6f2fd' },
];

const delay = (i: number) => ({ animationDelay: `${i * 70}ms` });

export default function TodayTab({
  plan,
  streakDays,
  checkInResponse,
  onCheckIn,
  onShowGuide,
}: {
  plan: HandoffPlan;
  streakDays: number;
  checkInResponse: CheckInResponse | null;
  onCheckIn: () => void;
  onShowGuide: (key: string) => void;
}) {
  const [done, setDone] = useState<Set<string>>(() => new Set(['metformin-am']));
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const completed = TASKS.filter((t) => done.has(t.id)).length;
  const pct = completed / TASKS.length;

  return (
    <div
      className="px-5 pb-8 pt-4 text-ink2"
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* greeting */}
      <header className="reveal flex items-start justify-between" style={delay(0)}>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Day {streakDays} of your plan
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
        <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-mint-strong shadow-[0_6px_16px_-8px_rgba(23,26,31,0.3)]">
          {plan.patientName.slice(0, 1)}
        </div>
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
            {completed} of {TASKS.length} done today · keep it going
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
        <h2
          className="mb-3 text-[17px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Today&rsquo;s plan
        </h2>
        <ul className="space-y-2.5">
          {TASKS.map((t) => {
            const isDone = done.has(t.id);
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
                        style={{ background: t.tint }}
                      >
                        <img
                          src={`/objects/${t.obj}`}
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
                  {t.guide ? (
                    <button
                      onClick={() => onShowGuide(t.guide!)}
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
