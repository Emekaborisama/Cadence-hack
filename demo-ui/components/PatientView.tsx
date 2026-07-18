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
import GuideSheet, { GUIDES } from "@/components/GuideSheet";
import { Button } from "@heroui/react";
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
  const [sendingDemo, setSendingDemo] = useState(false);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  // Demo shortcut: lets the patient page stand alone. Simulates the clinician
  // sending the plan so you can walk the patient journey without the clinic tab.
  async function sendPlanForDemo() {
    setSendingDemo(true);
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendPlan" }),
      });
    } finally {
      setSendingDemo(false);
    }
  }

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
    <main className="mono-canvas flex min-h-full flex-1 flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-[390px] items-center justify-between">
        <Link href="/" className="text-sm text-slate hover:text-ink2">
          ← Cadence
        </Link>
        <span className="text-xs text-muted">Patient · mobile</span>
      </div>

      <PhoneFrame>
        {!planSent ? (
          <WaitingState onProceed={sendPlanForDemo} sending={sendingDemo} />
        ) : (
          <div className="flex h-full flex-col">
            <div key={tab} className="flex-1 overflow-y-auto">
              {tab === "today" ? (
                <TodayTab
                  plan={state!.plan!}
                  streakDays={STREAK_DAYS}
                  checkInResponse={checkInResponse}
                  onCheckIn={() => setCheckInOpen(true)}
                  onShowGuide={setActiveGuide}
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

        {activeGuide && GUIDES[activeGuide] ? (
          <GuideSheet
            guide={GUIDES[activeGuide]}
            onClose={() => setActiveGuide(null)}
          />
        ) : null}
      </PhoneFrame>
    </main>
  );
}

function WaitingState({
  onProceed,
  sending,
}: {
  onProceed: () => void;
  sending: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-9 text-center"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint/25" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-mint-wash">
          <span className="h-3.5 w-3.5 rounded-full bg-mint" />
        </span>
      </div>
      <h2
        className="text-[24px] font-semibold text-ink2"
        style={{ fontFamily: "var(--font-sora), sans-serif" }}
      >
        Your review is with
        <br />
        your clinician
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-slate">
        The moment they send your plan, it appears here — everything you talked
        about, ready to follow.
      </p>
      <Button
        onPress={onProceed}
        isDisabled={sending}
        className="mt-7 rounded-2xl bg-mint px-6 py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
      >
        {sending ? "Receiving…" : "See my plan →"}
      </Button>
      <p className="mt-2 text-[12px] text-slate/70">Demo · simulates the clinician sending</p>
    </div>
  );
}
