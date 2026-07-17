"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";
import PatientTabBar, { type PatientTab } from "@/components/PatientTabBar";
import TodayTab from "@/components/TodayTab";
import PlanTab from "@/components/PlanTab";
import ProgressTab from "@/components/ProgressTab";
import CheckInSheet from "@/components/CheckInSheet";
import GlucoseSheet from "@/components/GlucoseSheet";
import { STREAK_DAYS } from "@/lib/fixtures";
import type { AppState, CheckInResponse } from "@/lib/types";

export default function PatientView() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<PatientTab>("today");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [glucoseOpen, setGlucoseOpen] = useState(false);
  const [checkInResponse, setCheckInResponse] = useState<CheckInResponse | null>(
    null,
  );
  const [glucoseResult, setGlucoseResult] = useState<CheckInResponse | null>(
    null,
  );

  // Poll shared state every second — the plan arrives when the clinician sends.
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data: AppState = await res.json();
        if (active) setState(data);
      } catch {
        // ignore transient poll errors during the demo
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const planSent = state?.planSent && state.plan;

  return (
    <main className="app-canvas flex min-h-full flex-1 flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-[390px] items-center justify-between">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Cadence
        </Link>
        <span className="text-xs text-muted">Patient · mobile</span>
      </div>

      <PhoneFrame>
        {!planSent ? (
          <WaitingState />
        ) : (
          <div className="flex h-full flex-col">
            <div key={tab} className="flex-1 overflow-y-auto">
              {tab === "today" ? (
                <TodayTab
                  plan={state!.plan!}
                  streakDays={STREAK_DAYS}
                  checkInResponse={checkInResponse}
                  onCheckIn={() => setCheckInOpen(true)}
                />
              ) : null}
              {tab === "plan" ? <PlanTab plan={state!.plan!} /> : null}
              {tab === "progress" ? (
                <ProgressTab
                  readings={state!.glucoseReadings}
                  target={state!.plan!.glucoseTarget}
                  glucoseResult={glucoseResult}
                  onLog={() => setGlucoseOpen(true)}
                />
              ) : null}
            </div>
            <PatientTabBar tab={tab} onChange={setTab} />
          </div>
        )}

        {checkInOpen ? (
          <CheckInSheet
            onClose={() => setCheckInOpen(false)}
            onSubmitted={(r) => {
              setCheckInResponse(r);
              setCheckInOpen(false);
              setTab("today");
            }}
          />
        ) : null}

        {glucoseOpen ? (
          <GlucoseSheet
            onClose={() => setGlucoseOpen(false)}
            onLogged={({ response }) => {
              setGlucoseResult(response);
              setGlucoseOpen(false);
              setTab("progress");
            }}
          />
        ) : null}
      </PhoneFrame>
    </main>
  );
}

function WaitingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-9 text-center">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-care/20" />
        <span className="relative h-3 w-3 rounded-full bg-care" />
      </div>
      <h2 className="font-serif text-2xl font-medium text-ink">
        Your review is with your clinician
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        The moment they send your plan, it appears here — everything you talked
        about, ready to follow.
      </p>
    </div>
  );
}
