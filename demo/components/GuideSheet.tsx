"use client";

import { useState } from "react";

export type Guide = {
  key: string;
  title: string;
  duration: string;
  object: string;
  tint: string;
  steps: { emoji: string; title: string; detail: string }[];
};

// Visual step-by-step walkthroughs, the "how do I actually do this?" moment.
// Each turns a one-line instruction into a short video + illustrated steps.
export const GUIDES: Record<string, Guide> = {
  bp: {
    key: "bp",
    title: "How to take your blood pressure",
    duration: "45 sec",
    object: "bp-cuff.png",
    tint: "#f0ecfb",
    steps: [
      { emoji: "🪑", title: "Rest first", detail: "Sit for 5 minutes, feet flat, back supported." },
      { emoji: "💪", title: "Bare arm on a table", detail: "Rest it level with your heart, palm up." },
      { emoji: "🔗", title: "Wrap the cuff snugly", detail: "One finger should fit under the edge." },
      { emoji: "🤫", title: "Stay still and quiet", detail: "Don't talk. Press start and breathe normally." },
      { emoji: "📲", title: "Log both numbers", detail: "Tap them into Cadence, we'll track the trend." },
    ],
  },
  semaglutide: {
    key: "semaglutide",
    title: "Your weekly semaglutide injection",
    duration: "60 sec",
    object: "semaglutide-pen.png",
    tint: "#e4f6f2",
    steps: [
      { emoji: "🗓️", title: "Same day each week", detail: "Pick a day you'll remember. We'll remind you." },
      { emoji: "🧼", title: "Clean the site", detail: "Belly, thigh, or upper arm, wipe and let dry." },
      { emoji: "🖊️", title: "Click the pen on", detail: "Press flat against the skin until it clicks." },
      { emoji: "⏱️", title: "Hold for 6 seconds", detail: "Keep it steady until the dose finishes." },
      { emoji: "✅", title: "Mark it done", detail: "Tap the injection in your plan to keep the streak." },
    ],
  },
};

export default function GuideSheet({
  guide,
  onClose,
}: {
  guide: Guide;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-end bg-[rgba(23,26,31,0.32)]"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <div className="max-h-[88%] overflow-y-auto rounded-t-[28px] border-t border-white bg-white p-5 pb-6 shadow-[0_-24px_50px_-20px_rgba(23,26,31,0.35)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hair" />
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[21px] font-semibold leading-snug text-ink2" style={{ fontFamily: "var(--font-sora), sans-serif" }}>
            {guide.title}
          </h3>
          <button onClick={onClose} className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-[13px] font-semibold text-slate">
            Close
          </button>
        </div>

        {/* video hero */}
        <button
          onClick={() => setPlaying((p) => !p)}
          className="relative mt-3 flex h-44 w-full items-center justify-center overflow-hidden rounded-3xl"
          style={{ background: guide.tint }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/objects/${guide.object}`} alt="" className="h-40 w-40 object-contain mix-blend-multiply" />
          <span className="absolute grid h-16 w-16 place-items-center rounded-full bg-mint text-ink2 shadow-lg">
            <span className="ml-0.5 text-[22px]">{playing ? "❚❚" : "▶"}</span>
          </span>
          <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-semibold text-ink2">
            {playing ? "Playing…" : `Watch the guide · ${guide.duration}`}
          </span>
          {playing ? (
            <span className="absolute bottom-0 left-0 h-1 w-1/3 bg-mint transition-all" />
          ) : null}
        </button>

        {/* steps */}
        <ol className="mt-4 space-y-2.5">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-hair bg-white p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-canvas text-[20px]">
                {s.emoji}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-ink2">
                  <span className="mr-1.5 text-mint-strong">{i + 1}.</span>
                  {s.title}
                </div>
                <div className="text-[13px] leading-snug text-slate">{s.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
