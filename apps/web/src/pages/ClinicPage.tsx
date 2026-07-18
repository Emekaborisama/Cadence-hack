import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import type { PlanPatch } from '@cadence/shared';
import { CONSULT_TRANSCRIPT } from '@cadence/shared';
import {
  extractPlan as extractAction,
  markRead as markReadAction,
  resetDemo,
  sendPlan as sendPlanAction,
} from '../api.js';
import { usePollState } from '../hooks/usePollState.js';
import ConsultPane from '../components/ConsultPane.js';
import PlanSidebar from '../components/PlanSidebar.js';
import InboxPanel from '../components/InboxPanel.js';

export default function ClinicPage() {
  const { state, setState } = usePollState();
  const [started, setStarted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [doseEdits, setDoseEdits] = useState<Record<string, string>>({});

  const sent = Boolean(state?.planSent);
  const draft = state?.draftPlan ?? null;
  const inbox = state?.inbox ?? [];

  // The sidebar shows: the sent plan once approved, else the AI draft under review.
  const plan: PlanPatch = useMemo(() => {
    if (sent && state?.handoffPlan) return state.handoffPlan;
    return draft ?? {};
  }, [sent, state?.handoffPlan, draft]);

  const reviewing = Boolean(draft) && !sent;
  const consultPhase: 'input' | 'readonly' = reviewing || sent || extracting ? 'readonly' : 'input';

  const statusLabel = extracting
    ? 'AI is structuring the consult — medications, doses, actions, safety protocols…'
    : reviewing
      ? 'Extraction complete — review, edit anything, then approve'
      : null;

  const handleExtract = useCallback(async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      setState(await extractAction(transcript));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed — try again.');
    } finally {
      setExtracting(false);
    }
  }, [transcript, setState]);

  const handleSend = useCallback(async () => {
    setSending(true);
    // Send the clinician-approved plan, applying any dose edits they made.
    const editedPlan: PlanPatch = {
      ...plan,
      medications: (plan.medications ?? []).map((m) =>
        doseEdits[m.id] != null && doseEdits[m.id].trim() ? { ...m, dose: doseEdits[m.id] } : m,
      ),
    };
    try {
      setState(await sendPlanAction(editedPlan));
      setEditing(false);
    } finally {
      setSending(false);
    }
  }, [plan, doseEdits, setState]);

  const markRead = useCallback(
    async (id: string) => {
      setState(await markReadAction(id));
    },
    [setState],
  );

  const handleReset = useCallback(async () => {
    const next = await resetDemo();
    setStarted(false);
    setTranscript('');
    setExtracting(false);
    setExtractError(null);
    setEditing(false);
    setDoseEdits({});
    setState(next);
  }, [setState]);

  const canSend = Boolean(plan.medications?.length) && !extracting;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-1 flex-col gap-4 p-5">
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
            Remote chronic-condition review ·{' '}
            <span className="text-ink">{plan.patientName ? `${plan.patientName}` : 'New consult'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!started && !reviewing && !sent ? (
            <Button
              onPress={() => setStarted(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-5 text-sm font-semibold text-ink2 data-[hovered=true]:opacity-90"
            >
              <span className="h-2 w-2 rounded-full bg-ink2/70" />
              Start consult
            </Button>
          ) : null}
          <Button
            onPress={handleReset}
            className="rounded-xl border border-line bg-white px-4 py-5 text-sm font-medium text-muted data-[hovered=true]:text-ink"
          >
            Reset
          </Button>
        </div>
      </header>

      {!started && !reviewing && !sent ? (
        <div className="flex min-h-[540px] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/70 px-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mint-wash">
            <span className="h-2.5 w-2.5 rounded-full bg-mint" />
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-muted">
            Press <span className="font-medium text-ink">Start consult</span>, then paste the
            transcript or your notes from the conversation. The AI structures it into the
            patient&rsquo;s care plan for your review — you approve before anything is sent.
          </p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
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
        </div>
      )}

      <InboxPanel items={inbox} onMarkRead={markRead} />
    </main>
  );
}
