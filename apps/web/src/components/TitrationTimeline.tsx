import type { TitrationStep } from '@cadence/shared';

// Vertical build-up of the medication dose. The highlighted step tracks the
// weeks since the plan was sent, so it reads as a true "you are here".
export default function TitrationTimeline({
  steps,
  currentIndex = 0,
}: {
  steps: TitrationStep[];
  currentIndex?: number;
}) {
  if (!steps.length) return null;
  return (
    <ol className="relative ml-1.5 border-l border-hair">
      {steps.map((step, i) => {
        const current = i === currentIndex;
        const past = i < currentIndex;
        return (
          <li key={step.id} className="mb-5 ml-5 last:mb-0">
            <span
              className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                current ? 'bg-mint' : past ? 'bg-mint/40' : 'bg-hair'
              }`}
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                {step.label}
              </span>
              {current ? (
                <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink2">
                  {currentIndex === 0 ? 'Start here' : 'You are here'}
                </span>
              ) : past ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-mint-strong">
                  ✓ done
                </span>
              ) : null}
            </div>
            <div className={`text-[15px] font-semibold ${past ? 'text-slate' : 'text-ink2'}`}>
              {step.dose}
            </div>
            {step.note ? <div className="text-[13px] text-slate">{step.note}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
