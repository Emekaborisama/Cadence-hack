import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import type { PlanPatch } from '@cadence/shared';
import { CONSULT_TRANSCRIPT, DAILY_TASK_COUNT } from '@cadence/shared';
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

const SELECTED_KEY = 'cadence.clinic.selectedId';

export default function ClinicPage() {
  const { state, setState } = usePollState();
  // Selection survives a refresh — losing your working patient on F5 reads
  // as data loss even though the records are server-side.
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
  const [doseEdits, setDoseEdits] = useState<Record<string, string>>({});

  const records = state?.records ?? [];
  const inbox = state?.inbox ?? [];
  const selected = records.find((r) => r.id === selectedId) ?? null;

  const sent = Boolean(selected?.planSent);
  const draft = selected?.draftPlan ?? null;

  // The sidebar shows: the sent plan once approved, else the AI draft under review.
  const plan: PlanPatch = useMemo(() => {
    if (selected?.planSent && selected.plan) return selected.plan;
    return draft ?? {};
  }, [selected, draft]);

  const reviewing = Boolean(draft) && !sent;
  const consultPhase: 'input' | 'readonly' = reviewing || sent || extracting ? 'readonly' : 'input';

  const statusLabel = extracting
    ? 'AI is structuring the consult — medications, doses, actions, safety protocols…'
    : reviewing
      ? 'Extraction complete — review, edit anything, then approve'
      : null;

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      if (editingPatient && selectedId) {
        setState(
          await updatePatientAction(selectedId, {
            name: newName.trim(),
            details: newDetails,
          }),
        );
        setEditingPatient(false);
      } else {
        const next = await createPatientAction(newName.trim(), newDetails.trim() || undefined);
        setState(next);
        // Newest record is first — select it so the consult targets it.
        const id = next.records[0]?.id ?? null;
        setSelectedId(id);
        if (id) localStorage.setItem(SELECTED_KEY, id);
        setTranscript('');
        setDoseEdits({});
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
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed — try again.');
    } finally {
      setExtracting(false);
    }
  }, [selected, transcript, setState]);

  const handleSend = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    const editedPlan: PlanPatch = {
      ...plan,
      medications: (plan.medications ?? []).map((m) =>
        doseEdits[m.id] != null && doseEdits[m.id].trim() ? { ...m, dose: doseEdits[m.id] } : m,
      ),
    };
    try {
      setState(await sendPlanAction(selected.id, editedPlan));
      setEditing(false);
    } finally {
      setSending(false);
    }
  }, [selected, plan, doseEdits, setState]);

  const markRead = useCallback(
    async (id: string) => setState(await markReadAction(id)),
    [setState],
  );

  const handleReset = useCallback(async () => {
    const next = await resetDemo();
    setSelectedId(null);
    setTranscript('');
    setExtracting(false);
    setExtractError(null);
    setEditing(false);
    setDoseEdits({});
    setState(next);
  }, [setState]);

  const selectPatient = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(SELECTED_KEY, id);
    setTranscript('');
    setExtractError(null);
    setEditing(false);
    setEditingPatient(false);
    setDoseEdits({});
  };

  const canSend = Boolean(plan.medications?.length) && !extracting && Boolean(selected);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-1 flex-col gap-4 p-5">
      <header className="flex items-end justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link to="/" className="font-serif text-lg font-medium text-ink hover:text-mint-strong">
              Cadence
            </Link>
            <span className="rounded-full bg-mint-wash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mint-strong">
              Clinician
            </span>
          </div>
          <p className="mt-1.5 text-[15px] text-muted">
            {selected ? (
              <>
                Remote review · <span className="text-ink">{selected.name}</span> ·{' '}
                <span className="font-mono text-[13px] text-mint-strong">{selected.id}</span>
              </>
            ) : (
              'Create or select a patient to begin'
            )}
          </p>
        </div>
        <Button
          onPress={handleReset}
          className="rounded-xl border border-line bg-white px-4 py-5 text-sm font-medium text-muted data-[hovered=true]:text-ink"
        >
          Reset
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_400px]">
        {/* Patient roster — the clinician creates records and issues codes. */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-line bg-white p-4">
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
            <Input
              className="mt-2"
              size="sm"
              label="Condition / context (optional)"
              value={newDetails}
              onValueChange={setNewDetails}
              classNames={{ inputWrapper: 'bg-paper' }}
            />
            <Button
              onPress={handleCreate}
              isDisabled={creating || !newName.trim()}
              className="mt-3 w-full rounded-xl bg-mint py-5 text-[13px] font-semibold text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-line data-[disabled=true]:text-muted"
            >
              {creating ? 'Saving…' : editingPatient ? 'Update record' : 'Create record'}
            </Button>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Patients ({records.length})
              </span>
              {(() => {
                const active = records.filter((r) => r.planSent);
                if (!active.length) return null;
                const avg = Math.round(
                  (active.reduce((sum, r) => sum + r.tasksDone.length, 0) /
                    (active.length * DAILY_TASK_COUNT)) *
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
                <p className="px-4 py-6 text-center text-[13px] text-muted">
                  No records yet. Create one and give the patient their code.
                </p>
              ) : (
                records.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => selectPatient(r.id)}
                      className={`block w-full px-4 py-3 text-left transition ${
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
                                width: `${Math.min(100, Math.round((r.tasksDone.length / DAILY_TASK_COUNT) * 100))}%`,
                              }}
                            />
                          </span>
                          <span className="text-[11px] font-medium text-muted">
                            {r.tasksDone.length}/{DAILY_TASK_COUNT} today
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
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPatient(true);
                              setNewName(r.name);
                              setNewDetails(r.details ?? '');
                            }}
                            className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                          >
                            Edit
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(r.id, r.name);
                            }}
                            className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-clay hover:opacity-80"
                          >
                            Delete
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Consult + plan, scoped to the selected patient. */}
        {selected ? (
          <>
            <div className="flex min-h-[540px] flex-col">
              <ConsultPane
                phase={consultPhase}
                transcript={transcript}
                onTranscriptChange={setTranscript}
                onUseSample={() => setTranscript(CONSULT_TRANSCRIPT)}
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
                sent={sent}
                sending={sending}
                canSend={canSend}
                editing={editing}
                onToggleEdit={() => setEditing((v) => !v)}
                doseEdits={doseEdits}
                onDoseChange={(id, val) => setDoseEdits((prev) => ({ ...prev, [id]: val }))}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-[540px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/70 px-8 text-center lg:col-span-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mint-wash">
              <span className="h-2.5 w-2.5 rounded-full bg-mint" />
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-muted">
              Create a patient record (or select one on the left), then paste the consult
              transcript or your notes. The AI structures it into their care plan for your
              review — you approve before anything is sent.
            </p>
          </div>
        )}
      </div>

      <InboxPanel items={inbox} onMarkRead={markRead} />
    </main>
  );
}
