import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import type { PlanPatch } from '@cadence/shared';
import {
  buildDailyTasks,
  CONSULT_TRANSCRIPT,
  currentTitrationStepIndex,
  DAILY_TASK_COUNT,
} from '@cadence/shared';
import {
  createPatient as createPatientAction,
  deletePatient as deletePatientAction,
  extractPlan as extractAction,
  markRead as markReadAction,
  resetDemo,
  sendPlan as sendPlanAction,
  updatePatient as updatePatientAction,
} from '../api.js';
import { usePollState } from '../hooks/usePollState.js';
import ConsultPane from '../components/ConsultPane.js';
import PlanSidebar from '../components/PlanSidebar.js';
import InboxPanel from '../components/InboxPanel.js';
import AuditPanel from '../components/AuditPanel.js';

const SELECTED_KEY = 'cadence.clinic.selectedId';
const TAB_KEY = 'cadence.clinic.tab';
const draftKey = (id: string) => `cadence.clinic.draft.${id}`;

// Conditions on the pathway. Only T2D is enabled this build — the patient
// surface (glucose targets, titration, protocols) is diabetes-specific today;
// the rest are the roadmap.
const CONDITIONS = [
  { value: 'Diabetes — Type 2', enabled: true },
  { value: 'Obesity', enabled: false },
  { value: 'Cardiovascular disease', enabled: false },
];

type ClinicTab = 'patients' | 'consult' | 'inbox' | 'audit';

const TABS: { id: ClinicTab; label: string }[] = [
  { id: 'patients', label: 'Patients' },
  { id: 'consult', label: 'Consult' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'audit', label: 'Audit log' },
];

const SELECTED_KEY = 'cadence.clinic.selectedId';

export default function ClinicPage() {
  const { state, setState } = usePollState();
  const [tab, setTab] = useState<ClinicTab>(
    () => (localStorage.getItem(TAB_KEY) as ClinicTab) || 'patients',
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_KEY),
  );
  const [newName, setNewName] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [editingPatient, setEditingPatient] = useState(false);
  const [creating, setCreating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  // Full clinician draft: entering edit mode clones the plan; every section is
  // then authorable. Cleared on send / patient switch / reset.
  const [editedPlan, setEditedPlan] = useState<PlanPatch | null>(null);

  const records = state?.records ?? [];
  const inbox = state?.inbox ?? [];
  const auditLog = state?.auditLog ?? [];
  // patientId → current titration dose, giving inbox flags their med context.
  const currentDose = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of records) {
      const steps = r.plan?.titrationSteps ?? [];
      if (steps.length) {
        const step = steps[currentTitrationStepIndex(steps, r.planSentAt)];
        map[r.id] = `${step.dose} (${step.label.toLowerCase()})`;
      }
    }
    return map;
  }, [records]);
  // Per-record task denominator, derived from the actual plan.
  const taskCount = (r: (typeof records)[number]) =>
    buildDailyTasks(r.plan).length || DAILY_TASK_COUNT;
  const selected = records.find((r) => r.id === selectedId) ?? null;
  const unread = inbox.filter((i) => !i.read).length;

  const sent = Boolean(selected?.planSent);
  const draft = selected?.draftPlan ?? null;
  const hasEdits = editedPlan !== null;

  const basePlan: PlanPatch = useMemo(() => {
    if (selected?.planSent && selected.plan && !draft) return selected.plan;
    return draft ?? {};
  }, [selected, draft]);
  const plan = editedPlan ?? basePlan;

  const reviewing = Boolean(draft) && !sent;
  // The consult pane accepts input pre-extract, and again when the clinician
  // wants a fresh consult against a sent plan (draft cleared, plan live).
  const consultPhase: 'input' | 'readonly' =
    extracting || reviewing || (sent && Boolean(selected?.transcript)) ? 'readonly' : 'input';

  const shownTranscript =
    consultPhase === 'readonly' ? (selected?.transcript ?? transcript) : transcript;

  const statusLabel = extracting
    ? 'AI is structuring the consult — medications, doses, actions, safety protocols…'
    : reviewing
      ? 'Extraction complete — review, edit anything, then approve'
      : sent && (editing || hasEdits)
        ? 'Editing the live plan — sending will notify the patient of the update'
        : null;

  const openTab = (t: ClinicTab) => {
    setTab(t);
    localStorage.setItem(TAB_KEY, t);
  };

  // Restore the transcript draft when a patient is selected — refresh-proof.
  useEffect(() => {
    if (!selectedId) return;
    setTranscript(localStorage.getItem(draftKey(selectedId)) ?? '');
  }, [selectedId]);

  const changeTranscript = (v: string) => {
    setTranscript(v);
    if (selectedId) localStorage.setItem(draftKey(selectedId), v);
  };

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      if (editingPatient && selectedId) {
        setState(
          await updatePatientAction(selectedId, { name: newName.trim(), details: newDetails }),
        );
        setEditingPatient(false);
      } else {
        const next = await createPatientAction(newName.trim(), newDetails.trim() || undefined);
        setState(next);
        const id = next.records[0]?.id ?? null;
        setSelectedId(id);
        if (id) localStorage.setItem(SELECTED_KEY, id);
        setEditedPlan(null);
      }
      setNewName('');
      setNewDetails('');
    } finally {
      setCreating(false);
    }
  }, [newName, newDetails, editingPatient, selectedId, setState]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Delete ${name}'s record (${id})? This removes their plan and flags.`)) {
        return;
      }
      setState(await deletePatientAction(id));
      localStorage.removeItem(draftKey(id));
      if (selectedId === id) {
        setSelectedId(null);
        localStorage.removeItem(SELECTED_KEY);
      }
    },
    [selectedId, setState],
  );

  const handleExtract = useCallback(async () => {
    if (!selected) return;
    setExtracting(true);
    setExtractError(null);
    try {
      setState(await extractAction(selected.id, transcript));
      localStorage.removeItem(draftKey(selected.id));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed — try again.');
    } finally {
      setExtracting(false);
    }
  }, [selected, transcript, setState]);

  const handleSend = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    try {
      setState(await sendPlanAction(selected.id, plan));
      setEditing(false);
      setEditedPlan(null);
    } finally {
      setSending(false);
    }
  }, [selected, plan, setState]);

  const toggleEdit = () => {
    if (!editing && !editedPlan) {
      // Entering edit mode: clone so the clinician works on their own copy.
      setEditedPlan(structuredClone(basePlan));
    }
    setEditing((v) => !v);
  };

  const markRead = useCallback(
    async (id: string) => setState(await markReadAction(id)),
    [setState],
  );

  const handleReset = useCallback(async () => {
    const next = await resetDemo();
    setSelectedId(null);
    localStorage.removeItem(SELECTED_KEY);
    setTranscript('');
    setExtracting(false);
    setExtractError(null);
    setEditing(false);
    setEditingPatient(false);
    setEditedPlan(null);
    setState(next);
  }, [setState]);

  const selectPatient = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(SELECTED_KEY, id);
    setExtractError(null);
    setEditing(false);
    setEditingPatient(false);
    setEditedPlan(null);
  };

  const canSend =
    Boolean(plan.medications?.length) &&
    !extracting &&
    Boolean(selected) &&
    (!sent || Boolean(draft) || hasEdits);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-1 flex-col gap-4 p-5">
      <header className="border-b border-line pb-0">
        <div className="flex items-end justify-between pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                className="font-serif text-lg font-medium text-ink hover:text-mint-strong"
              >
                Cadence
              </Link>
              <span className="rounded-full bg-mint-wash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mint-strong">
                Clinician
              </span>
            </div>
            <p className="mt-1.5 text-[15px] text-muted">
              {selected ? (
                <>
                  <span className="text-ink">{selected.name}</span> ·{' '}
                  <span className="font-mono text-[13px] text-mint-strong">{selected.id}</span>
                  {selected.details ? <> · {selected.details}</> : null}
                </>
              ) : (
                'No patient selected'
              )}
            </p>
          </div>
          <Button
            onPress={handleReset}
            className="rounded-xl border border-line bg-white px-4 py-5 text-sm font-medium text-muted data-[hovered=true]:text-ink"
          >
            Reset
          </Button>
        </div>
        {/* Tab bar — one focused surface at a time, keyboard/screen-reader friendly. */}
        <nav role="tablist" className="flex gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => openTab(t.id)}
                className={`relative rounded-t-xl px-4 py-2.5 text-[13.5px] font-semibold transition ${
                  active
                    ? 'border border-b-0 border-line bg-white text-ink'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
                {t.id === 'inbox' && unread > 0 ? (
                  <span className="ml-1.5 rounded-full bg-clay px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>

      {tab === 'patients' ? (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-line bg-white p-4 md:self-start">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
                {editingPatient ? `Edit ${selected?.name ?? 'patient'}` : 'New patient'}
              </span>
              {editingPatient ? (
                <button
                  onClick={() => {
                    setEditingPatient(false);
                    setNewName('');
                    setNewDetails('');
                  }}
                  className="text-[11px] font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <Input
              className="mt-2"
              size="sm"
              label="Name"
              value={newName}
              onValueChange={setNewName}
              classNames={{ inputWrapper: 'bg-paper' }}
            />
            <label className="mt-2 block">
              <span className="text-[11px] font-medium text-muted">Condition</span>
              <select
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-[13px] text-ink outline-none focus-visible:border-mint"
              >
                <option value="">Select condition…</option>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value} disabled={!c.enabled}>
                    {c.value}
                    {c.enabled ? '' : ' (coming soon)'}
                  </option>
                ))}
              </select>
            </label>
            <Button
              onPress={handleCreate}
              isDisabled={creating || !newName.trim()}
              className="mt-3 w-full rounded-xl bg-mint py-5 text-[13px] font-semibold text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-line data-[disabled=true]:text-muted"
            >
              {creating ? 'Saving…' : editingPatient ? 'Update record' : 'Create record'}
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Patients ({records.length})
              </span>
              {(() => {
                const active = records.filter((r) => r.planSent);
                if (!active.length) return null;
                const avg = Math.round(
                  (active.reduce((sum, r) => sum + r.tasksDone.length / taskCount(r), 0) /
                    active.length) *
                    100,
                );
                return (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      avg >= 50 ? 'bg-mint-wash text-mint-strong' : 'bg-ochre-wash text-ochre'
                    }`}
                    title="Average of today's task completion across patients on a plan"
                  >
                    {avg}% on track today
                  </span>
                );
              })()}
            </div>
            <div className="divide-y divide-line overflow-y-auto">
              {records.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  No records yet. Create one and give the patient their code.
                </p>
              ) : (
                records.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <div
                      key={r.id}
                      onClick={() => selectPatient(r.id)}
                      className={`cursor-pointer px-4 py-3 transition ${
                        active ? 'bg-mint-wash' : 'hover:bg-paper'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            r.planSent
                              ? 'bg-mint-wash text-mint-strong'
                              : r.draftPlan
                                ? 'bg-ochre-wash text-ochre'
                                : 'bg-paper-2 text-muted'
                          }`}
                        >
                          {r.planSent ? 'Plan sent' : r.draftPlan ? 'Reviewing' : 'New'}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[12px] text-mint-strong">{r.id}</div>
                      {r.details ? (
                        <div className="mt-0.5 truncate text-[12px] text-muted">{r.details}</div>
                      ) : null}
                      {r.planSent ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[11.5px] font-semibold text-ochre">
                            🔥 {r.streakDays}d streak
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                            <span
                              className="block h-full rounded-full bg-mint"
                              style={{
                                width: `${Math.min(100, Math.round((r.tasksDone.length / taskCount(r)) * 100))}%`,
                              }}
                            />
                          </span>
                          <span className="text-[11px] font-medium text-muted">
                            {r.tasksDone.length}/{taskCount(r)} today
                          </span>
                        </div>
                      ) : null}
                      {active && !r.profile ? (
                        <div className="mt-1.5 rounded-lg bg-white px-2 py-1.5 text-[11.5px] leading-snug text-muted">
                          Give the patient this code — they enter it in the app to open their
                          record.
                        </div>
                      ) : null}
                      {active ? (
                        <div className="mt-1.5 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTab('consult');
                            }}
                            className="rounded-md bg-mint px-2 py-1 text-[11px] font-semibold text-ink2"
                          >
                            Open consult →
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPatient(true);
                              setNewName(r.name);
                              setNewDetails(r.details ?? '');
                            }}
                            className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(r.id, r.name);
                            }}
                            className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-clay hover:opacity-80"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'consult' ? (
        selected ? (
          <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
            <div className="flex min-h-[540px] flex-col">
              <ConsultPane
                phase={consultPhase}
                transcript={shownTranscript}
                onTranscriptChange={changeTranscript}
                onUseSample={() => changeTranscript(CONSULT_TRANSCRIPT)}
                sampleLabel={`Load sample consult — ${selected.details || 'Type 2 diabetes'}`}
                onExtract={handleExtract}
                extracting={extracting}
                error={extractError}
              />
            </div>
            <div className="flex min-h-[540px] flex-col">
              <PlanSidebar
                plan={plan}
                lastEventLabel={statusLabel}
                onSend={handleSend}
                sent={sent && !draft}
                sending={sending}
                canSend={canSend}
                editing={editing}
                onToggleEdit={toggleEdit}
                onPlanChange={setEditedPlan}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/70 px-8 text-center">
            <p className="max-w-md text-[15px] leading-relaxed text-muted">
              No patient selected.{' '}
              <button className="font-semibold text-mint-strong underline" onClick={() => openTab('patients')}>
                Choose or create one
              </button>{' '}
              to start the consult.
            </p>
          </div>
        )
      ) : null}

      {tab === 'inbox' ? (
        <InboxPanel items={inbox} onMarkRead={markRead} currentDose={currentDose} />
      ) : null}

      {tab === 'audit' ? <AuditPanel entries={auditLog} /> : null}
    </main>
  );
}
