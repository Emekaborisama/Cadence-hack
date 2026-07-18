import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import type { Explainer } from '@cadence/shared';
import { explain } from '../api.js';

// Progressive "explain it simpler" trail — tap to keep simplifying a clinical
// concept until it clicks. Levels are AI-generated from the clinician's own
// plan (live mode) or scripted (fixture); either way it's a rephrasing of what
// was said, never new medical advice. Generated once per plan, cached server-side.
export default function SimplifyCard({
  explainer,
  onLoaded,
}: {
  explainer: Explainer | null;
  onLoaded: (e: Explainer) => void;
}) {
  const [i, setI] = useState(0);
  const [got, setGot] = useState(false);
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);

  // Lazily generate on first render if the server has no cached explainer yet.
  useEffect(() => {
    if (explainer || requested.current) return;
    requested.current = true;
    setLoading(true);
    explain()
      .then((state) => {
        if (state.explainer) onLoaded(state.explainer);
      })
      .finally(() => setLoading(false));
  }, [explainer, onLoaded]);

  if (!explainer) {
    return (
      <div className="mono-card rounded-3xl p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          <span aria-hidden>✦</span> Understand
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-hair" />
          <div className="h-4 w-full animate-pulse rounded-full bg-hair" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-hair" />
        </div>
        <p className="mt-3 text-[12.5px] text-slate">
          {loading ? 'Writing a plain-language explanation from your plan…' : 'Preparing…'}
        </p>
      </div>
    );
  }

  const levels = explainer.levels;
  const atSimplest = i >= levels.length - 1;

  return (
    <div className="mono-card rounded-3xl p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
        <span aria-hidden>✦</span> Understand · {explainer.title}
      </div>

      {/* the trail so far */}
      <div className="mt-3 space-y-2">
        {levels.slice(0, i + 1).map((l, idx) => {
          const current = idx === i;
          return (
            <div
              key={idx}
              className={`rounded-2xl px-3.5 py-2.5 ${
                current ? 'bg-mint-wash' : 'bg-canvas opacity-70'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                {l.tag}
              </div>
              <div className={`mt-0.5 text-ink2 ${current ? 'text-[15px]' : 'text-[13.5px]'}`}>
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
              idx <= i ? 'w-5 bg-mint' : 'w-1.5 bg-hair'
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
