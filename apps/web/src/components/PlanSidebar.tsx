import { useState } from 'react';
import { Button } from '@heroui/react';
import type {
  Appointment,
  ApprovedProtocol,
  LifestyleAction,
  Medication,
  PlanPatch,
  RedFlag,
  TitrationStep,
} from '@cadence/shared';
import TitrationTimeline from './TitrationTimeline.js';
import type { ReactNode } from 'react';

const STATUS_LABEL: Record<string, string> = {
  continued: 'Keep',
  adjusted: 'Changed',
  new: 'New',
};
const STATUS_STYLE: Record<string, string> = {
  continued: 'bg-paper-2 text-muted',
  adjusted: 'bg-ochre-wash text-ochre',
  new: 'bg-mint-wash text-mint-strong',
};

const inputCls =
  'w-full rounded-lg border border-mint/40 bg-mint-wash/30 px-2.5 py-1.5 text-[13px] text-ink outline-none focus-visible:border-mint';
const labelCls = 'mt-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted';

// The structured plan the clinician reviews and OWNS. In edit mode every
// section is authorable — edit, add, remove — because the whole safety model
// rests on this being the clinician's plan, not the AI's.
export default function PlanSidebar({
  plan,
  lastEventLabel,
  onSend,
  sent,
  sending,
  canSend,
  editing,
  onToggleEdit,
  onPlanChange,
}: {
  plan: PlanPatch;
  lastEventLabel: string | null;
  onSend: () => void;
  sent: boolean;
  sending: boolean;
  canSend: boolean;
  editing: boolean;
  onToggleEdit: () => void;
  onPlanChange: (next: PlanPatch) => void;
}) {
  const meds = plan.medications ?? [];
  const titration = plan.titrationSteps ?? [];
  const lifestyle = plan.lifestyleActions ?? [];
  const redFlags = plan.redFlags ?? [];
  const appointments = plan.appointments ?? [];
  const protocols = plan.protocols ?? [];
  const isEmpty = meds.length + lifestyle.length + redFlags.length === 0;

  // Collapsed-by-default except medications; edit mode opens everything so a
  // review never misses a section. Add on a collapsed section auto-expands it.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Medications: true,
  });
  const isOpen = (label: string) => editing || Boolean(openSections[label]);
  const toggle = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !isOpen(label) }));
  const openAndAdd = (label: string, add: () => void) => () => {
    setOpenSections((prev) => ({ ...prev, [label]: true }));
    add();
  };

  const patch = (p: Partial<PlanPatch>) => onPlanChange({ ...plan, ...p });
  const editList =
    <T extends { id: string }>(key: keyof PlanPatch, list: T[]) =>
    (id: string, item: Partial<T>) =>
      patch({ [key]: list.map((x) => (x.id === id ? { ...x, ...item } : x)) } as Partial<PlanPatch>);
  const removeFrom =
    <T extends { id: string }>(key: keyof PlanPatch, list: T[]) =>
    (id: string) =>
      patch({ [key]: list.filter((x) => x.id !== id) } as Partial<PlanPatch>);
  const addTo =
    <T,>(key: keyof PlanPatch, list: T[]) =>
    (item: T) =>
      patch({ [key]: [...list, item] } as Partial<PlanPatch>);

  const editMed = editList<Medication>('medications', meds);
  const editTit = editList<TitrationStep>('titrationSteps', titration);
  const editLife = editList<LifestyleAction>('lifestyleActions', lifestyle);
  const editFlag = editList<RedFlag>('redFlags', redFlags);
  const editAppt = editList<Appointment>('appointments', appointments);
  const editProto = editList<ApprovedProtocol>('protocols', protocols);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex items-start justify-between border-b border-line bg-white px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            {editing ? 'Editing — you own this plan' : 'AI extraction'}
          </div>
          <div className="font-serif text-lg font-medium text-ink">Care plan</div>
          {plan.condition ? <div className="text-[13px] text-muted">{plan.condition}</div> : null}
        </div>
        {meds.length ? (
          <Button
            onPress={onToggleEdit}
            className={`rounded-lg border px-3 py-4 text-[13px] font-semibold ${
              editing
                ? 'border-mint bg-mint text-ink2'
                : 'border-line bg-white text-muted data-[hovered=true]:text-ink'
            }`}
          >
            {editing ? 'Done' : 'Edit'}
          </Button>
        ) : null}
      </div>

      {lastEventLabel ? (
        <div className="flex items-center gap-2 border-b border-line bg-mint-wash px-5 py-2.5 text-[13px] font-medium text-mint-strong">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-mint" />
          {lastEventLabel}
        </div>
      ) : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[14px] leading-relaxed text-muted">
              As the consult proceeds, captured medications, doses, and actions build here for
              you to review.
            </p>
          </div>
        ) : null}

        {meds.length || editing ? (
          <Group
            label="Medications"
            count={meds.length}
            open={isOpen('Medications')}
            onToggle={() => toggle('Medications')}
            editing={editing}
            onAdd={openAndAdd('Medications', () =>
              addTo<Medication>('medications', meds)({
                id: `med-${Date.now()}`,
                name: 'New medication',
                dose: '',
                schedule: '',
                why: '',
                status: 'new',
              }),
            )}
          >
            <div className="space-y-2.5">
              {meds.map((m) => (
                <div key={m.id} className="rounded-xl border border-line bg-white p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    {editing ? (
                      <input
                        value={m.name}
                        onChange={(e) => editMed(m.id, { name: e.target.value })}
                        className={`${inputCls} font-serif text-[15px]`}
                      />
                    ) : (
                      <span className="font-serif text-[16px] font-medium text-ink">{m.name}</span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[m.status] ?? STATUS_STYLE.continued}`}
                    >
                      {STATUS_LABEL[m.status] ?? 'Keep'}
                    </span>
                    {editing ? <Remove onPress={() => removeFrom('medications', meds)(m.id)} /> : null}
                  </div>
                  {editing ? (
                    <>
                      <label className={labelCls}>Dose</label>
                      <input value={m.dose} onChange={(e) => editMed(m.id, { dose: e.target.value })} className={inputCls} />
                      <label className={labelCls}>Schedule</label>
                      <input value={m.schedule} onChange={(e) => editMed(m.id, { schedule: e.target.value })} className={inputCls} />
                      <label className={labelCls}>Why (in your words, shown to the patient)</label>
                      <textarea value={m.why} onChange={(e) => editMed(m.id, { why: e.target.value })} rows={2} className={inputCls} />
                    </>
                  ) : (
                    <>
                      <div className="mt-1.5 text-[14px] font-medium text-ink">{m.dose}</div>
                      <div className="mt-0.5 text-[12px] text-muted">{m.schedule}</div>
                      <p className="mt-1.5 line-clamp-2 text-[12px] italic leading-snug text-mint-strong">
                        &ldquo;{m.why}&rdquo;
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Group>
        ) : null}

        {titration.length || editing ? (
          <Group
            label="Titration schedule"
            count={titration.length}
            open={isOpen('Titration schedule')}
            onToggle={() => toggle('Titration schedule')}
            editing={editing}
            onAdd={openAndAdd('Titration schedule', () =>
              addTo<TitrationStep>('titrationSteps', titration)({
                id: `tit-${Date.now()}`,
                label: 'Weeks …',
                dose: '',
              }),
            )}
          >
            <div className="rounded-xl border border-line bg-white p-4">
              {editing ? (
                <div className="space-y-3">
                  {titration.map((t) => (
                    <div key={t.id} className="rounded-lg border border-hair p-2.5">
                      <div className="flex items-center gap-2">
                        <input value={t.label} onChange={(e) => editTit(t.id, { label: e.target.value })} className={inputCls} placeholder="Weeks 1–4" />
                        <Remove onPress={() => removeFrom('titrationSteps', titration)(t.id)} />
                      </div>
                      <input value={t.dose} onChange={(e) => editTit(t.id, { dose: e.target.value })} className={`${inputCls} mt-1.5`} placeholder="0.25 mg once a week" />
                      <input value={t.note ?? ''} onChange={(e) => editTit(t.id, { note: e.target.value })} className={`${inputCls} mt-1.5`} placeholder="Note (optional)" />
                    </div>
                  ))}
                </div>
              ) : (
                <TitrationTimeline steps={titration} />
              )}
            </div>
          </Group>
        ) : null}

        {lifestyle.length || editing ? (
          <Group
            label="Lifestyle & monitoring"
            count={lifestyle.length + (plan.glucoseTarget ? 1 : 0)}
            open={isOpen('Lifestyle & monitoring')}
            onToggle={() => toggle('Lifestyle & monitoring')}
            editing={editing}
            onAdd={openAndAdd('Lifestyle & monitoring', () =>
              addTo<LifestyleAction>('lifestyleActions', lifestyle)({
                id: `life-${Date.now()}`,
                title: '',
                detail: '',
                category: 'other',
              }),
            )}
          >
            <ul className="space-y-2">
              {lifestyle.map((a) => (
                <li key={a.id} className="rounded-xl border border-line bg-white px-3.5 py-2.5">
                  {editing ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input value={a.title} onChange={(e) => editLife(a.id, { title: e.target.value })} className={inputCls} placeholder="Action" />
                        <Remove onPress={() => removeFrom('lifestyleActions', lifestyle)(a.id)} />
                      </div>
                      <input value={a.detail} onChange={(e) => editLife(a.id, { detail: e.target.value })} className={`${inputCls} mt-1.5`} placeholder="Detail the patient sees" />
                    </div>
                  ) : (
                    <>
                      <div className="text-[14px] font-medium text-ink">{a.title}</div>
                      <div className="text-[13px] text-muted">{a.detail}</div>
                    </>
                  )}
                </li>
              ))}
              {plan.glucoseTarget ? (
                <li className="rounded-xl border border-line bg-white px-3.5 py-2.5">
                  <div className="text-[14px] font-medium text-ink">Home glucose target</div>
                  {editing ? (
                    <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
                      <input
                        type="number"
                        step="0.1"
                        value={plan.glucoseTarget.low}
                        onChange={(e) =>
                          patch({ glucoseTarget: { ...plan.glucoseTarget!, low: Number(e.target.value) } })
                        }
                        className={`${inputCls} w-20`}
                      />
                      –
                      <input
                        type="number"
                        step="0.1"
                        value={plan.glucoseTarget.high}
                        onChange={(e) =>
                          patch({ glucoseTarget: { ...plan.glucoseTarget!, high: Number(e.target.value) } })
                        }
                        className={`${inputCls} w-20`}
                      />
                      mmol/L fasting
                    </div>
                  ) : (
                    <div className="text-[13px] text-muted">
                      {plan.glucoseTarget.low}–{plan.glucoseTarget.high} mmol/L, fasting. Readings
                      above route to you.
                    </div>
                  )}
                </li>
              ) : null}
            </ul>
          </Group>
        ) : null}

        {redFlags.length || editing ? (
          <Group
            label="What to watch for"
            count={redFlags.length}
            open={isOpen('What to watch for')}
            onToggle={() => toggle('What to watch for')}
            editing={editing}
            onAdd={openAndAdd('What to watch for', () =>
              addTo<RedFlag>('redFlags', redFlags)({ id: `flag-${Date.now()}`, symptom: '', action: '' }),
            )}
          >
            <ul className="space-y-2">
              {redFlags.map((f) => (
                <li key={f.id} className="rounded-xl border border-clay/20 bg-clay-wash px-3.5 py-2.5">
                  {editing ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input value={f.symptom} onChange={(e) => editFlag(f.id, { symptom: e.target.value })} className={inputCls} placeholder="Symptom to watch for" />
                        <Remove onPress={() => removeFrom('redFlags', redFlags)(f.id)} />
                      </div>
                      <input value={f.action} onChange={(e) => editFlag(f.id, { action: e.target.value })} className={`${inputCls} mt-1.5`} placeholder="What the patient should do" />
                    </div>
                  ) : (
                    <>
                      <div className="text-[14px] font-semibold text-clay">{f.symptom}</div>
                      <div className="text-[13px] text-ink/70">{f.action}</div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Group>
        ) : null}

        {protocols.length || editing ? (
          <Group
            label="Safety protocols attached"
            count={protocols.length}
            open={isOpen('Safety protocols attached')}
            onToggle={() => toggle('Safety protocols attached')}
            editing={editing}
            onAdd={openAndAdd('Safety protocols attached', () =>
              addTo<ApprovedProtocol>('protocols', protocols)({
                id: `proto-${Date.now()}`,
                trigger: '',
                label: '',
                steps: [''],
                escalateWhen: '',
              }),
            )}
          >
            <p className="-mt-1 mb-2 text-[12px] leading-snug text-muted">
              Your approved responses. The companion hands over these exact steps when the
              patient reports a symptom, and escalates to you at your threshold.
            </p>
            <ul className="space-y-2">
              {protocols.map((p) => (
                <li key={p.id} className="rounded-xl border border-mint/25 bg-mint-wash/60 px-3.5 py-2.5">
                  {editing ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input value={p.label} onChange={(e) => editProto(p.id, { label: e.target.value })} className={inputCls} placeholder="Protocol name, e.g. Nausea (early weeks)" />
                        <Remove onPress={() => removeFrom('protocols', protocols)(p.id)} />
                      </div>
                      <label className={labelCls}>Matches symptom keyword</label>
                      <input value={p.trigger} onChange={(e) => editProto(p.id, { trigger: e.target.value.toLowerCase() })} className={inputCls} placeholder="nausea" />
                      <label className={labelCls}>Steps (one per line)</label>
                      <textarea
                        value={p.steps.join('\n')}
                        onChange={(e) => editProto(p.id, { steps: e.target.value.split('\n') })}
                        rows={3}
                        className={inputCls}
                      />
                      <label className={labelCls}>Escalate when</label>
                      <input value={p.escalateWhen} onChange={(e) => editProto(p.id, { escalateWhen: e.target.value })} className={inputCls} placeholder="Moderate or worse" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-mint-strong">{p.label}</span>
                        <span className="text-[11px] font-medium text-mint-strong">
                          {p.steps.length} steps
                        </span>
                      </div>
                      <div className="text-[12px] text-ink/60">Escalate when: {p.escalateWhen}</div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Group>
        ) : null}

        {appointments.length || editing ? (
          <Group
            label="Follow-up"
            count={appointments.length}
            open={isOpen('Follow-up')}
            onToggle={() => toggle('Follow-up')}
            editing={editing}
            onAdd={openAndAdd('Follow-up', () =>
              addTo<Appointment>('appointments', appointments)({
                id: `appt-${Date.now()}`,
                title: 'Follow-up review',
                when: '',
              }),
            )}
          >
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a.id} className="rounded-xl border border-line bg-white px-3.5 py-2.5">
                  {editing ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input value={a.title} onChange={(e) => editAppt(a.id, { title: e.target.value })} className={inputCls} />
                        <Remove onPress={() => removeFrom('appointments', appointments)(a.id)} />
                      </div>
                      <input value={a.when} onChange={(e) => editAppt(a.id, { when: e.target.value })} className={`${inputCls} mt-1.5`} placeholder="When" />
                    </div>
                  ) : (
                    <>
                      <div className="text-[14px] font-medium text-ink">{a.title}</div>
                      <div className="text-[13px] text-muted">{a.when}</div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Group>
        ) : null}
      </div>

      <div className="border-t border-line bg-white p-4">
        {canSend && !sent ? (
          <p className="mb-2 text-center text-[12px] text-muted">
            {meds.length} medicines · {lifestyle.length} actions · {protocols.length} safety
            protocols to approve
          </p>
        ) : null}
        <Button
          onPress={onSend}
          isDisabled={!canSend || sending}
          className={`w-full rounded-xl px-4 py-6 text-[15px] font-semibold ${
            sent && !canSend
              ? 'bg-mint-wash text-mint-strong'
              : 'bg-mint text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-mint-wash data-[disabled=true]:text-mint-strong'
          }`}
        >
          {sending
            ? 'Sending…'
            : sent
              ? canSend
                ? `Send update to ${plan.patientName ?? 'patient'}`
                : `✓ Approved & sent to ${plan.patientName ?? 'patient'}`
              : 'Approve & send to patient'}
        </Button>
        <p className="mt-2.5 text-center text-[12px] leading-snug text-muted">
          {sent
            ? 'Edit anything and send — the patient is notified of the update.'
            : 'Nothing reaches the patient until you approve it here.'}
        </p>
      </div>
    </div>
  );
}

function Remove({ onPress }: { onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      aria-label="Remove"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-white text-[13px] font-bold text-clay hover:bg-clay-wash"
    >
      ×
    </button>
  );
}

// Collapsible section — the count keeps a collapsed section legible, so the
// clinician can keep only what they're reviewing open instead of scrolling
// the whole plan.
function Group({
  label,
  count,
  editing,
  onAdd,
  open,
  onToggle,
  children,
}: {
  label: string;
  count?: number;
  editing?: boolean;
  onAdd?: () => void;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1.5 text-left"
        >
          <span
            className={`text-[10px] text-muted transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {label}
            {typeof count === 'number' ? (
              <span className="ml-1.5 rounded-full bg-paper-2 px-1.5 py-0.5 text-[10px] font-bold text-ink/60">
                {count}
              </span>
            ) : null}
          </h3>
        </button>
        {editing && onAdd ? (
          <button
            onClick={onAdd}
            className="rounded-md bg-mint-wash px-2 py-0.5 text-[11px] font-semibold text-mint-strong"
          >
            ＋ Add
          </button>
        ) : null}
      </div>
      {open ? children : null}
    </section>
  );
}
