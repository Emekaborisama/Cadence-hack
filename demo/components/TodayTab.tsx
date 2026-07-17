"use client";

import { useState } from "react";
import type { CarePlan, CheckInResponse } from "@/lib/types";

type Task = {
  id: string;
  title: string;
  detail: string;
  when: string;
  weekly?: boolean;
};

// Today's actions derived from the care plan — the retention loop. Reminders
// and a streak give the patient a reason to open the app on day 12.
function tasksFromPlan(plan: CarePlan): Task[] {
  return [
    {
      id: "glucose-am",
      title: "Log morning glucose",
      detail: "Before breakfast",
      when: "8:00",
    },
    {
      id: "metformin-am",
      title: "Metformin 1000mg",
      detail: "With breakfast",
      when: "8:00",
    },
    {
      id: "semaglutide",
      title: "Semaglutide injection",
      detail: "Weekly, same day each week",
      when: "Sun",
      weekly: true,
    },
    {
      id: "walk",
      title: "Evening walk",
      detail: "20 minutes after your meal",
      when: "19:30",
    },
    {
      id: "metformin-pm",
      title: "Metformin 1000mg",
      detail: "With evening meal",
      when: "19:00",
    },
  ];
}

const delay = (i: number) => ({ animationDelay: `${i * 80}ms` });

export default function TodayTab({
  plan,
  streakDays,
  checkInResponse,
  onCheckIn,
}: {
  plan: CarePlan;
  streakDays: number;
  checkInResponse: CheckInResponse | null;
  onCheckIn: () => void;
}) {
  const tasks = tasksFromPlan(plan);
  // A couple pre-done to show a day in progress and reinforce the streak.
  const [done, setDone] = useState<Set<string>>(
    () => new Set(["metformin-am"]),
  );
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const completed = tasks.filter((t) => done.has(t.id)).length;

  return (
    <div className="px-5 pb-6 pt-5">
      {/* letter-style handoff hero */}
      <header className="reveal" style={delay(0)}>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-care" />
          From today&rsquo;s consultation
        </div>
        <h1 className="mt-2.5 font-serif text-[1.9rem] font-medium leading-[1.1] text-ink">
          Hello {plan.patientName}.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
          {plan.summary}
        </p>
      </header>

      {/* streak / consistency */}
      <div
        className="reveal mt-5 flex items-center justify-between glass rounded-2xl px-4 py-3.5"
        style={delay(1)}
      >
        <div>
          <div className="text-[15px] font-semibold text-ink">
            {streakDays}-day streak
          </div>
          <div className="text-[13px] text-muted">
            {completed} of {tasks.length} done today
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < streakDays ? "bg-care" : "border border-line bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* scheduled check-in nudge — the reason to open on day 12 */}
      <div
        className="reveal mt-4 rounded-2xl border border-care/25 bg-care-wash p-4"
        style={delay(2)}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-care-strong">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-care/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-care" />
          </span>
          Week 2 check-in
        </div>
        <p className="mt-2 font-serif text-[17px] leading-snug text-ink">
          You&rsquo;re two weeks into semaglutide. How are you feeling?
        </p>
        <button
          onClick={onCheckIn}
          className="mt-3 w-full rounded-xl bg-care px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-care-strong"
        >
          Check in with my care team
        </button>
      </div>

      {/* care-team response after a check-in */}
      {checkInResponse ? (
        <div
          className={`reveal mt-4 space-y-2 rounded-2xl border p-4 ${
            checkInResponse.escalate
              ? "border-clay/25 bg-clay-wash"
              : "border-care/25 bg-care-wash"
          }`}
        >
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-care-strong">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-care" />
            From your care team
          </h2>
          <p className="font-serif text-[15px] italic leading-snug text-ink/80">
            {checkInResponse.message}
          </p>
          <ul className="space-y-1.5 pt-0.5">
            {checkInResponse.protocolSteps.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 text-[14px] leading-snug text-ink/80"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-care" />
                {s}
              </li>
            ))}
          </ul>
          {checkInResponse.escalate && checkInResponse.escalationNote ? (
            <p className="rounded-lg bg-white/70 p-2.5 text-[13px] font-medium text-clay">
              {checkInResponse.escalationNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* today's checklist */}
      <section className="reveal mt-6" style={delay(3)}>
        <h2 className="mb-3 font-serif text-lg font-medium text-ink">
          Today&rsquo;s plan
        </h2>
        <ul className="space-y-2">
          {tasks.map((t) => {
            const isDone = done.has(t.id);
            return (
              <li key={t.id}>
                <button
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-3 glass rounded-2xl px-3.5 py-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold ${
                      isDone
                        ? "border-care bg-care text-white"
                        : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="flex-1">
                    <span
                      className={`block text-[15px] font-medium ${
                        isDone ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {t.detail}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-paper-2 px-2 py-1 text-[12px] font-semibold text-muted">
                    {t.weekly ? t.when : `⏰ ${t.when}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
