"use client";

import { useState } from "react";
import type { CheckInResponse, GlucoseReading } from "@/lib/types";

type LogResult = { reading: GlucoseReading; response: CheckInResponse };

// Bottom sheet for logging a glucose reading. Quick-pick values keep the demo
// one tap away from an in-range or a high reading.
export default function GlucoseSheet({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: (r: LogResult) => void;
}) {
  const [value, setValue] = useState("6.9");
  const [context, setContext] = useState<"fasting" | "post-meal">("fasting");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logGlucose",
          value: Number(value),
          context,
        }),
      });
      const data = await res.json();
      onLogged({ reading: data.reading, response: data.response });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/30">
      <div className="rounded-t-[1.75rem] border-t border-white/60 bg-white/85 p-5 shadow-[0_-20px_40px_-20px_rgba(20,30,25,0.3)] backdrop-blur-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h3 className="font-serif text-xl font-medium text-ink">
          Log a glucose reading
        </h3>
        <p className="mt-1 text-[14px] leading-snug text-muted">
          Enter your reading. We&rsquo;ll compare it to the target your clinician
          set.
        </p>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Reading (mmol/L)
        </label>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[17px] font-medium text-ink outline-none focus-visible:border-care focus-visible:ring-2 focus-visible:ring-care/20"
        />
        <div className="mt-2 flex gap-2">
          {["5.6", "6.9", "11.9"].map((v) => (
            <button
              key={v}
              onClick={() => setValue(v)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-muted hover:border-care/40"
            >
              {v}
            </button>
          ))}
        </div>

        <label className="mt-3.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          When
        </label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["fasting", "post-meal"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setContext(c)}
              className={`rounded-xl border px-3 py-2.5 text-[14px] font-medium capitalize transition ${
                context === c
                  ? "border-care bg-care-wash text-care-strong"
                  : "border-line bg-white text-muted hover:border-care/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !value.trim()}
            className="flex-1 rounded-xl bg-care px-4 py-3 text-[15px] font-semibold text-white transition enabled:hover:bg-care-strong disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save reading"}
          </button>
        </div>
      </div>
    </div>
  );
}
