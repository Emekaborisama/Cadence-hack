import type { TitrationStep } from "@/lib/types";

// Vertical build-up of the semaglutide dose. The first step is where the
// patient starts now, so it reads as "you are here".
export default function TitrationTimeline({
  steps,
}: {
  steps: TitrationStep[];
}) {
  if (!steps.length) return null;
  return (
    <ol className="relative ml-1.5 border-l border-hair">
      {steps.map((step, i) => {
        const current = i === 0;
        return (
          <li key={step.id} className="mb-5 ml-5 last:mb-0">
            <span
              className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                current ? "bg-mint" : "bg-hair"
              }`}
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                {step.label}
              </span>
              {current ? (
                <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink2">
                  Start here
                </span>
              ) : null}
            </div>
            <div className="text-[15px] font-semibold text-ink2">{step.dose}</div>
            {step.note ? (
              <div className="text-[13px] text-slate">{step.note}</div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
