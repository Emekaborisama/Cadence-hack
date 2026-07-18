"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import TranscriptStream from "@/components/TranscriptStream";
import PlanSidebar from "@/components/PlanSidebar";
import InboxPanel from "@/components/InboxPanel";
import {
  CONSULT_TRANSCRIPT,
  EXTRACTION_EVENTS,
} from "@/lib/fixtures";
import type { CarePlan, InboxItem } from "@/lib/types";

const WORDS = CONSULT_TRANSCRIPT.split(/\s+/);
const WORD_MS = 90; // stream cadence — fast enough to demo, slow enough to read

export default function ClinicView() {
  const [started, setStarted] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [plan, setPlan] = useState<Partial<CarePlan>>({});
  const [lastEventLabel, setLastEventLabel] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [doseEdits, setDoseEdits] = useState<Record<string, string>>({});
  const firedRef = useRef<Set<number>>(new Set());

  const streaming = started && wordIndex < WORDS.length;

  const streamedText = useMemo(
    () => WORDS.slice(0, wordIndex).join(" "),
    [wordIndex],
  );

  // Drive the word-by-word stream.
  useEffect(() => {
    if (!streaming) return;
    const t = setTimeout(() => setWordIndex((i) => i + 1), WORD_MS);
    return () => clearTimeout(t);
  }, [streaming, wordIndex]);

  // Fire extraction events as the stream crosses their word index.
  useEffect(() => {
    for (const evt of EXTRACTION_EVENTS) {
      if (wordIndex >= evt.atWordIndex && !firedRef.current.has(evt.atWordIndex)) {
        firedRef.current.add(evt.atWordIndex);
        setPlan((prev) => ({ ...prev, ...evt.planPatch }));
        setLastEventLabel(evt.label);
      }
    }
  }, [wordIndex]);

  // Poll shared state for the inbox (closed loop from the patient side).
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = await res.json();
        if (active) setInbox(data.inbox ?? []);
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

  const startConsult = () => {
    setStarted(true);
    setWordIndex(1);
  };

  const sendPlan = useCallback(async () => {
    setSending(true);
    // Send the clinician-approved plan, applying any dose edits they made.
    const editedPlan: Partial<CarePlan> = {
      ...plan,
      medications: (plan.medications ?? []).map((m) =>
        doseEdits[m.id] != null && doseEdits[m.id].trim()
          ? { ...m, dose: doseEdits[m.id] }
          : m,
      ),
    };
    try {
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendPlan",
          transcript: CONSULT_TRANSCRIPT,
          plan: editedPlan,
        }),
      });
      setSent(true);
      setEditing(false);
    } finally {
      setSending(false);
    }
  }, [plan, doseEdits]);

  const markRead = useCallback(async (id: string) => {
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", id }),
    });
    setInbox((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  }, []);

  const resetDemo = useCallback(async () => {
    await fetch("/api/reset", { method: "POST" });
    firedRef.current.clear();
    setStarted(false);
    setWordIndex(0);
    setPlan({});
    setLastEventLabel(null);
    setSent(false);
    setInbox([]);
    setEditing(false);
    setDoseEdits({});
  }, []);

  const canSend = Boolean(plan.medications?.length);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[1200px] flex-1 flex-col gap-4 p-5">
      <header className="flex items-end justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="font-serif text-lg font-medium text-ink hover:text-mint-strong"
            >
              Cadence
            </Link>
            <span className="rounded-full bg-mint-wash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mint-strong">
              Clinician
            </span>
          </div>
          <p className="mt-1.5 text-[15px] text-muted">
            Remote diabetes review · <span className="text-ink">Meera, 52</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!started ? (
            <Button
              onPress={startConsult}
              className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-5 text-sm font-semibold text-ink2 data-[hovered=true]:opacity-90"
            >
              <span className="h-2 w-2 rounded-full bg-ink2/70" />
              Start consult
            </Button>
          ) : null}
          <Button
            onPress={resetDemo}
            className="rounded-xl border border-line bg-white px-4 py-5 text-sm font-medium text-muted data-[hovered=true]:text-ink"
          >
            Reset demo
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-[540px] flex-col">
          <TranscriptStream
            text={streamedText}
            streaming={streaming}
            started={started}
          />
        </div>
        <div className="flex min-h-[540px] flex-col">
          <PlanSidebar
            plan={plan}
            lastEventLabel={lastEventLabel}
            onSend={sendPlan}
            sent={sent}
            sending={sending}
            canSend={canSend}
            editing={editing}
            onToggleEdit={() => setEditing((v) => !v)}
            doseEdits={doseEdits}
            onDoseChange={(id, val) =>
              setDoseEdits((prev) => ({ ...prev, [id]: val }))
            }
          />
        </div>
      </div>

      <InboxPanel items={inbox} onMarkRead={markRead} />
    </main>
  );
}
