import type { AuditEntry } from '@cadence/shared';

const ACTOR_STYLE: Record<AuditEntry['actor'], string> = {
  clinician: 'bg-mint-wash text-mint-strong',
  patient: 'bg-sky-wash text-ink/70',
  system: 'bg-paper-2 text-muted',
};

const EVENT_LABEL: Record<string, string> = {
  'record.created': 'Record created',
  'record.updated': 'Record updated',
  'record.deleted': 'Record deleted',
  'consult.extracted': 'Consult extracted',
  'plan.sent': 'Plan approved & sent',
  'plan.updated': 'Plan updated',
  'patient.onboarded': 'Patient onboarded',
  'checkin.flagged': 'Check-in flagged',
  'glucose.flagged': 'Glucose flagged',
};

// The clinician-side event trail: every change to records, plans, and every
// patient signal that crossed a threshold — newest first.
export default function AuditPanel({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-5 py-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          Accountability
        </div>
        <div className="font-serif text-lg font-medium text-ink">Audit log</div>
      </div>
      <div className="divide-y divide-line">
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-muted">
            No events yet. Every record change, plan send, and flagged patient signal lands
            here with a timestamp.
          </p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase ${ACTOR_STYLE[e.actor]}`}
              >
                {e.actor}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-semibold text-ink">
                    {EVENT_LABEL[e.event] ?? e.event}
                  </span>
                  {e.patientName ? (
                    <span className="text-[13px] text-muted">
                      {e.patientName}
                      {e.patientId ? (
                        <span className="ml-1 font-mono text-[11px] text-mint-strong">
                          {e.patientId}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {e.detail ? (
                  <div className="mt-0.5 truncate text-[12.5px] text-muted">{e.detail}</div>
                ) : null}
                {e.changes?.length ? (
                  <ul className="mt-1.5 space-y-0.5 rounded-lg bg-paper px-2.5 py-2 font-mono text-[11.5px] leading-relaxed">
                    {e.changes.map((c, i) => (
                      <li
                        key={i}
                        className={
                          c.startsWith('+')
                            ? 'text-mint-strong'
                            : c.startsWith('−')
                              ? 'text-clay'
                              : 'text-ochre'
                        }
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <span className="shrink-0 text-[11.5px] text-muted/80">
                {new Date(e.at).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
