"use client";

import { useState } from "react";
import type { CheckIn, CheckInResponse, CheckInSeverity } from "@/lib/types";

const SEVERITIES: CheckInSeverity[] = ["mild", "moderate", "severe"];

// Bottom-sheet-style check-in form the patient uses to report a side effect.
export default function CheckInSheet({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (response: CheckInResponse) => void;
}) {
  const [symptom, setSymptom] = useState("Nausea");
  const [severity, setSeverity] = useState<CheckInSeverity>("moderate");
  const [note, setNote] = useState("Feeling queasy since starting the injection.");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const checkIn: CheckIn = {
      symptom,
      severity,
      note: note.trim() || undefined,
      loggedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkIn", checkIn }),
      });
      const data = await res.json();
      onSubmitted(data.response as CheckInResponse);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/30">
      <div className="rounded-t-[1.75rem] border-t border-white/60 bg-white/85 p-5 shadow-[0_-20px_40px_-20px_rgba(20,30,25,0.3)] backdrop-blur-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h3 className="font-serif text-xl font-medium text-ink">
          How are you feeling?
        </h3>
        <p className="mt-1 text-[14px] leading-snug text-muted">
          Tell us what&apos;s going on. Your care team&apos;s guidance appears
          right away.
        </p>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Symptom
        </label>
        <input
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none focus-visible:border-care focus-visible:ring-2 focus-visible:ring-care/20"
        />

        <label className="mt-3.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          How bad is it?
        </label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-xl border px-3 py-2.5 text-[14px] font-medium capitalize transition ${
                severity === s
                  ? "border-care bg-care-wash text-care-strong"
                  : "border-line bg-white text-muted hover:border-care/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <label className="mt-3.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Anything else? (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none focus-visible:border-care focus-visible:ring-2 focus-visible:ring-care/20"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !symptom.trim()}
            className="flex-1 rounded-xl bg-care px-4 py-3 text-[15px] font-semibold text-white transition enabled:hover:bg-care-strong disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send to my care team"}
          </button>
        </div>
      </div>
    </div>
  );
}
