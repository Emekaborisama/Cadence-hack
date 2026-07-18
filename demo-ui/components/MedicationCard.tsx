import type { Medication } from "@/lib/types";

const STATUS_LABEL: Record<Medication["status"], string> = {
  continued: "Keep taking",
  adjusted: "Dose changed",
  new: "New for you",
};

const STATUS_STYLE: Record<Medication["status"], string> = {
  continued: "bg-paper-2 text-muted",
  adjusted: "bg-ochre-wash text-ochre",
  new: "bg-care-wash text-care-strong",
};

// Medication card. Dose/when are the data; the clinician's own "why" is the
// signature — set as a quoted voice so the plan feels personally handed over.
export default function MedicationCard({ med }: { med: Medication }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl font-medium leading-tight text-ink">
            {med.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[med.status]}`}
          >
            {STATUS_LABEL[med.status]}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Dose
            </div>
            <div className="text-[15px] font-medium text-ink">{med.dose}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              When
            </div>
            <div className="text-[15px] font-medium text-ink">
              {med.schedule}
            </div>
          </div>
        </div>
      </div>

      {/* clinician voice — the recurring signature thread */}
      <figure className="border-t border-white/50 bg-care-wash/50 px-4 py-3">
        <blockquote className="font-serif text-[15px] italic leading-snug text-care-strong">
          &ldquo;{med.why}&rdquo;
        </blockquote>
        <figcaption className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-care">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-care" />
          from your clinician
        </figcaption>
      </figure>
    </div>
  );
}
