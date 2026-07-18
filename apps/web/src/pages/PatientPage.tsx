import { useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import type { CheckInResponse, Explainer } from '@cadence/shared';
import { findRecord } from '../api.js';
import { usePollState } from '../hooks/usePollState.js';
import PatientTabBar, { type PatientTab } from '../components/PatientTabBar.js';
import OnboardingFlow from '../components/OnboardingFlow.js';
import TodayTab from '../components/TodayTab.js';
import PlanTab from '../components/PlanTab.js';
import ProgressTab from '../components/ProgressTab.js';
import CheckInSheet from '../components/CheckInSheet.js';
import GlucoseSheet from '../components/GlucoseSheet.js';
import GuideSheet, { GUIDES } from '../components/GuideSheet.js';
import InboxTab from '../components/InboxTab.js';

const STORAGE_KEY = 'cadence.patientId';

// The patient app — full-screen web app (installable PWA). The patient signs
// in with the short code their clinician issued; their whole record (plan,
// streak, readings, inbox) lives server-side against that code, so nothing
// resets on refresh or on a different device.
export default function PatientPage() {
  const { state, setState } = usePollState();
  const [patientId, setPatientId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [tab, setTab] = useState<PatientTab>('today');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [glucoseOpen, setGlucoseOpen] = useState(false);
  const [checkInResponse, setCheckInResponse] = useState<CheckInResponse | null>(null);
  const [glucoseResult, setGlucoseResult] = useState<CheckInResponse | null>(null);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [seenCount, setSeenCount] = useState(0);

  const record = findRecord(state, patientId);
  const inboxCount = record?.inbox.length ?? 0;
  const hasUnread = inboxCount > seenCount;

  const openTab = (t: PatientTab) => {
    if (t === 'inbox') setSeenCount(inboxCount);
    setTab(t);
  };

  const signIn = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id.toUpperCase());
    setPatientId(id.toUpperCase());
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPatientId(null);
  };

  const setExplainer = (explainer: Explainer) =>
    setState((prev) =>
      prev && record
        ? {
            ...prev,
            records: prev.records.map((r) =>
              r.id === record.id ? { ...r, explainer } : r,
            ),
          }
        : prev,
    );

  return (
    <div className="mono-canvas min-h-dvh">
      <main className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden">
        {!state ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading Cadence…" color="warning" />
          </div>
        ) : !record ? (
          <SignIn
            onSignIn={signIn}
            knownInvalid={Boolean(patientId)}
            staleId={patientId}
            onClearStale={signOut}
          />
        ) : !record.profile ? (
          <OnboardingFlow
            patientId={record.id}
            defaultName={record.name}
            onDone={setState}
          />
        ) : !record.planSent || !record.plan ? (
          <WaitingState name={record.profile.name} code={record.id} />
        ) : (
          <>
            <div key={tab} className="flex-1 overflow-y-auto">
              {tab === 'today' ? (
                <TodayTab
                  patientId={record.id}
                  plan={record.plan}
                  streakDays={record.streakDays}
                  tasksDone={record.tasksDone}
                  checkInResponse={checkInResponse}
                  onCheckIn={() => setCheckInOpen(true)}
                  onShowGuide={setActiveGuide}
                  onState={setState}
                />
              ) : null}
              {tab === 'plan' ? (
                <PlanTab
                  patientId={record.id}
                  plan={record.plan}
                  explainer={record.explainer}
                  onExplainerLoaded={setExplainer}
                />
              ) : null}
              {tab === 'progress' ? (
                <ProgressTab
                  readings={record.glucoseReadings}
                  target={record.plan.glucoseTarget}
                  glucoseResult={glucoseResult}
                  onLog={() => setGlucoseOpen(true)}
                />
              ) : null}
              {tab === 'inbox' ? <InboxTab messages={record.inbox} /> : null}
            </div>
            <PatientTabBar tab={tab} onChange={openTab} alert={hasUnread ? 'inbox' : null} />
          </>
        )}

        {checkInOpen && record ? (
          <CheckInSheet
            patientId={record.id}
            onClose={() => setCheckInOpen(false)}
            onSubmitted={(r) => {
              setCheckInResponse(r);
              setCheckInOpen(false);
              setTab('today');
            }}
          />
        ) : null}

        {glucoseOpen && record ? (
          <GlucoseSheet
            patientId={record.id}
            onClose={() => setGlucoseOpen(false)}
            onLogged={(response) => {
              setGlucoseResult(response);
              setGlucoseOpen(false);
              setTab('progress');
            }}
          />
        ) : null}

        {activeGuide && GUIDES[activeGuide] ? (
          <GuideSheet guide={GUIDES[activeGuide]} onClose={() => setActiveGuide(null)} />
        ) : null}
      </main>
    </div>
  );
}

// Sign-in with the clinician-issued code — like a booking reference.
// Production path: NHS login; identity always originates with the provider.
function SignIn({
  onSignIn,
  knownInvalid,
  staleId,
  onClearStale,
}: {
  onSignIn: (id: string) => void;
  knownInvalid: boolean;
  staleId: string | null;
  onClearStale: () => void;
}) {
  const [code, setCode] = useState('');

  return (
    <div
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-mint/15" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-mint-wash">
          <span className="h-3.5 w-3.5 rounded-full bg-mint" />
        </span>
      </div>
      <h1
        className="text-[26px] font-semibold leading-tight text-ink2"
        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
      >
        Welcome to Cadence
      </h1>
      <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-slate">
        Enter the patient code your care team gave you to open your record.
      </p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="CAD-XXXX"
        autoCapitalize="characters"
        className="mt-6 w-full max-w-[240px] rounded-2xl border-2 border-hair bg-white px-4 py-3.5 text-center text-[20px] font-semibold tracking-[0.12em] text-ink2 outline-none placeholder:text-slate/40 focus-visible:border-mint"
        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        onKeyDown={(e) => e.key === 'Enter' && code.trim() && onSignIn(code)}
      />

      {knownInvalid && staleId ? (
        <p className="mt-3 max-w-[280px] text-[13px] leading-snug text-blush">
          {staleId} isn&rsquo;t recognised (the record may have been reset).{' '}
          <button className="underline" onClick={onClearStale}>
            Clear it
          </button>{' '}
          and enter a current code.
        </p>
      ) : null}

      <Button
        onPress={() => code.trim() && onSignIn(code)}
        isDisabled={!code.trim()}
        className="mt-5 w-full max-w-[240px] rounded-2xl bg-mint py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-hair data-[disabled=true]:text-slate"
      >
        Open my record
      </Button>
      <p className="mt-4 max-w-[260px] text-[12px] leading-snug text-slate/70">
        Your clinician creates your record and gives you this code at your review.
      </p>
    </div>
  );
}

function WaitingState({ name, code }: { name: string; code: string }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-9 text-center"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint/25" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-mint-wash">
          <span className="h-3.5 w-3.5 rounded-full bg-mint" />
        </span>
      </div>
      <h2
        className="text-[24px] font-semibold text-ink2"
        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
      >
        You&rsquo;re all set, {name}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-slate">
        Your review is with your clinician. The moment they approve and send your plan, it
        appears here — everything you talked about, ready to follow.
      </p>
      <p className="mt-6 text-[12px] text-slate/70">
        Signed in as {code} · checking automatically — nothing to do.
      </p>
    </div>
  );
}
