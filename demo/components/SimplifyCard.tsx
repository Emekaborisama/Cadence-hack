"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

export type SimplifyLevel = { tag: string; text: string };

// Progressive "explain it simpler" trail, tap to keep simplifying a complex
// clinical concept until it clicks. The AI would generate these levels on the
// fly; here they're scripted for the demo.
export const HBA1C_LEVELS: SimplifyLevel[] = [
  {
    tag: "As your clinician said",
    text: "Your HbA1c came back at 58 mmol/mol, so we want to bring that down.",
  },
  {
    tag: "In plain terms",
    text: "HbA1c is your average blood sugar over the last ~3 months. 58 is a little above target, we're aiming for under 48.",
  },
  {
    tag: "Simpler",
    text: "Think of it as your blood-sugar “score” for the past few months. Yours is a bit high, so the plan gently brings it down.",
  },
  {
    tag: "Simplest",
    text: "It's like a report card for your blood sugar. Yours needs a little work, and that's exactly what your plan is for.",
  },
];

export default function SimplifyCard({
  title = "Your HbA1c, explained",
  levels = HBA1C_LEVELS,
}: {
  title?: string;
  levels?: SimplifyLevel[];
}) {
  const [i, setI] = useState(0);
  const [got, setGot] = useState(false);
  const atSimplest = i >= levels.length - 1;
  const level = levels[i];

  return (
    <div className="mono-card rounded-3xl p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
        <span aria-hidden>✦</span> Understand · {title}
      </div>

      {/* the trail so far */}
      <div className="mt-3 space-y-2">
        {levels.slice(0, i + 1).map((l, idx) => {
          const current = idx === i;
          return (
            <div
              key={idx}
              className={`rounded-2xl px-3.5 py-2.5 ${
                current ? "bg-mint-wash" : "bg-canvas opacity-70"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                {l.tag}
              </div>
              <div className={`mt-0.5 text-ink2 ${current ? "text-[15px]" : "text-[13.5px]"}`}>
                {l.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* level dots */}
      <div className="mt-3 flex items-center gap-1.5">
        {levels.map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx <= i ? "w-5 bg-mint" : "w-1.5 bg-hair"
            }`}
          />
        ))}
      </div>

      {/* control */}
      <div className="mt-3">
        {got ? (
          <div className="rounded-2xl bg-mint-wash px-4 py-3 text-center text-[14px] font-semibold text-mint-strong">
            Nice, glad that clicked 👍
          </div>
        ) : !atSimplest ? (
          <Button
            onPress={() => setI((v) => v + 1)}
            className="w-full rounded-2xl border border-mint/40 bg-white py-6 text-[14px] font-semibold text-mint-strong data-[hovered=true]:bg-mint-wash"
          >
            Explain it simpler ↓
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onPress={() => setI(0)}
              className="flex-1 rounded-2xl border border-hair bg-white py-6 text-[14px] font-semibold text-slate data-[hovered=true]:text-ink2"
            >
              Start over
            </Button>
            <Button
              onPress={() => setGot(true)}
              className="flex-1 rounded-2xl bg-mint py-6 text-[14px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
            >
              I&rsquo;ve got it 👍
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
