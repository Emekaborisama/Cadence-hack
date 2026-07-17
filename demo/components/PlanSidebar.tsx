"use client";

import type { CarePlan } from "@/lib/types";
import TitrationTimeline from "./TitrationTimeline";

const STATUS_LABEL: Record<string, string> = {
  continued: "Keep",
  adjusted: "Changed",
  new: "New",
};
const STATUS_STYLE: Record<string, string> = {
  continued: "bg-paper-2 text-muted",
  adjusted: "bg-ochre-wash text-ochre",
  new: "bg-care-wash text-care-strong",
};

// The structured plan that assembles itself in the clinician's sidebar during
// the stream. The clinician can edit doses, sees the safety protocols that
// will be attached, and approves before anything reaches the patient.
export default function PlanSidebar({
  plan,
  lastEventLabel,
  onSend,
  sent,
  sending,
  canSend,
  editing,
  onToggleEdit,
  doseEdits,
  onDoseChange,
}: {
  plan: Partial<CarePlan>;
  lastEventLabel: string | null;
  onSend: () => void;
  sent: boolean;
  sending: boolean;
  canSend: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  doseEdits: Record<string, string>;
  onDoseChange: (id: string, value: string) => void;
}) {
  const meds = plan.medications ?? [];
  const titration = plan.titrationSteps ?? [];
  const lifestyle = plan.lifestyleActions ?? [];
  const redFlags = plan.redFlags ?? [];
  const appointments = plan.appointments ?? [];
  const protocols = plan.protocols ?? [];
  const isEmpty = meds.length + lifestyle.length + redFlags.length === 0;

  const doseValue = (id: string, fallback: string) =>
    doseEdits[id]?.trim() ? doseEdits[id] : fallback;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex items-start justify-between border-b border-line bg-white px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
            AI extraction
          </div>
          <div className="font-serif text-lg font-medium text-ink">
            Care plan
          </div>
          {plan.condition ? (
            <div className="text-[13px] text-muted">{plan.condition}</div>
          ) : null}
        </div>
        {meds.length && !sent ? (
          <button
            onClick={onToggleEdit}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition ${
              editing
                ? "border-care bg-care text-white"
                : "border-line bg-white text-muted hover:text-ink"
            }`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        ) : null}
      </div>

      {lastEventLabel ? (
        <div className="flex items-center gap-2 border-b border-line bg-care-wash px-5 py-2.5 text-[13px] font-medium text-care-strong">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-care" />
          {lastEventLabel}
        </div>
      ) : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[14px] leading-relaxed text-muted">
              As the consult proceeds, captured medications, doses, and actions
              build here for you to review.
            </p>
          </div>
        ) : null}

        {meds.length ? (
          <Group label="Medications">
            <div className="space-y-2.5">
              {meds.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-line bg-white p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[16px] font-medium text-ink">
                      {m.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[m.status]}`}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  {editing ? (
                    <input
                      value={doseEdits[m.id] ?? m.dose}
                      onChange={(e) => onDoseChange(m.id, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-care/40 bg-care-wash/40 px-2.5 py-1.5 text-[14px] font-medium text-ink outline-none focus-visible:border-care focus-visible:ring-2 focus-visible:ring-care/20"
                    />
                  ) : (
                    <div className="mt-1.5 text-[14px] font-medium text-ink">
                      {doseValue(m.id, m.dose)}
                      {doseEdits[m.id]?.trim() &&
                      doseEdits[m.id] !== m.dose ? (
                        <span className="ml-2 rounded bg-ochre-wash px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ochre">
                          edited
                        </span>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-0.5 text-[12px] text-muted">
                    {m.schedule}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12px] italic leading-snug text-care-strong">
                    &ldquo;{m.why}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </Group>
        ) : null}

        {titration.length ? (
          <Group label="Titration schedule">
            <div className="rounded-xl border border-line bg-white p-4">
              <TitrationTimeline steps={titration} />
            </div>
          </Group>
        ) : null}

        {lifestyle.length ? (
          <Group label="Lifestyle & monitoring">
            <ul className="space-y-2">
              {lifestyle.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-line bg-white px-3.5 py-2.5"
                >
                  <div className="text-[14px] font-medium text-ink">
                    {a.title}
                  </div>
                  <div className="text-[13px] text-muted">{a.detail}</div>
                </li>
              ))}
              {plan.glucoseTarget ? (
                <li className="rounded-xl border border-line bg-white px-3.5 py-2.5">
                  <div className="text-[14px] font-medium text-ink">
                    Home glucose target
                  </div>
                  <div className="text-[13px] text-muted">
                    {plan.glucoseTarget.low}–{plan.glucoseTarget.high} mmol/L,
                    fasting. Readings above route to you.
                  </div>
                </li>
              ) : null}
            </ul>
          </Group>
        ) : null}

        {redFlags.length ? (
          <Group label="What to watch for">
            <ul className="space-y-2">
              {redFlags.map((f) => (
                <li
                  key={f.id}
                  className="rounded-xl border border-clay/20 bg-clay-wash px-3.5 py-2.5"
                >
                  <div className="text-[14px] font-semibold text-clay">
                    {f.symptom}
                  </div>
                  <div className="text-[13px] text-ink/70">{f.action}</div>
                </li>
              ))}
            </ul>
          </Group>
        ) : null}

        {protocols.length ? (
          <Group label="Safety protocols attached">
            <p className="-mt-1 mb-2 text-[12px] leading-snug text-muted">
              Your approved responses. The companion hands over these exact
              steps when Meera reports a symptom, and escalates to you at your
              threshold.
            </p>
            <ul className="space-y-2">
              {protocols.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-care/25 bg-care-wash/60 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-care-strong">
                      {p.label}
                    </span>
                    <span className="text-[11px] font-medium text-care">
                      {p.steps.length} steps
                    </span>
                  </div>
                  <div className="text-[12px] text-ink/60">
                    Escalate when: {p.escalateWhen}
                  </div>
                </li>
              ))}
            </ul>
          </Group>
        ) : null}

        {appointments.length ? (
          <Group label="Follow-up">
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-line bg-white px-3.5 py-2.5"
                >
                  <div className="text-[14px] font-medium text-ink">
                    {a.title}
                  </div>
                  <div className="text-[13px] text-muted">{a.when}</div>
                </li>
              ))}
            </ul>
          </Group>
        ) : null}
      </div>

      <div className="border-t border-line bg-white p-4">
        {canSend && !sent ? (
          <p className="mb-2 text-center text-[12px] text-muted">
            {meds.length} medicines · {lifestyle.length} actions ·{" "}
            {protocols.length} safety protocols to approve
          </p>
        ) : null}
        <button
          onClick={onSend}
          disabled={!canSend || sending || sent}
          className={`w-full rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care ${
            sent
              ? "bg-care-wash text-care-strong"
              : "bg-care text-white enabled:hover:bg-care-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          }`}
        >
          {sent
            ? "✓ Approved & sent to Meera"
            : sending
              ? "Sending…"
              : "Approve & send to patient"}
        </button>
        <p className="mt-2.5 text-center text-[12px] leading-snug text-muted">
          Nothing reaches the patient until you approve it here.
        </p>
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </h3>
      {children}
    </section>
  );
}
