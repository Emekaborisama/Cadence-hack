import { useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import type { CheckInResponse, Explainer } from '@cadence/shared';
import { STREAK_DAYS } from '@cadence/shared';
import { sendPlan } from '../api.js';
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

// The patient app — a real full-screen web app (installable PWA). Mobile-first;
// on desktop it renders as a centered app column over the canvas.
export default function PatientPage() {
  const { state, setState } = usePollState();
  const [tab, setTab] = useState<PatientTab>('today');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [glucoseOpen, setGlucoseOpen] = useState(false);
  const [checkInResponse, setCheckInResponse] = useState<CheckInResponse | null>(null);
  const [glucoseResult, setGlucoseResult] = useState<CheckInResponse | null>(null);
  const [sendingDemo, setSendingDemo] = useState(false);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  // Unread dot: messages that arrived since the inbox was last opened.
  const [seenCount, setSeenCount] = useState(0);
  const inboxCount = state?.patientInbox.length ?? 0;
  const hasUnread = inboxCount > seenCount;

  const openTab = (t: PatientTab) => {
    if (t === 'inbox') setSeenCount(inboxCount);
    setTab(t);
  };

  const setExplainer = (explainer: Explainer) =>
    setState((prev) => (prev ? { ...prev, explainer } : prev));

  async function sendPlanForDemo() {
    setSendingDemo(true);
    try {
      setState(await sendPlan());
    } finally {
      setSendingDemo(false);
    }
  }

  const onboarded = Boolean(state?.patientProfile);
  const planSent = Boolean(state?.planSent && state.handoffPlan);

  return (
    <div className="mono-canvas min-h-dvh">
      <main className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden">
        {!state ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading Cadence…" color="warning" />
          </div>
        ) : !onboarded ? (
          <OnboardingFlow onDone={setState} />
        ) : !planSent ? (
          <WaitingState
            name={state.patientProfile!.name}
            onProceed={sendPlanForDemo}
            sending={sendingDemo}
          />
        ) : (
          <>
            <div key={tab} className="flex-1 overflow-y-auto">
              {tab === 'today' ? (
                <TodayTab
                  plan={state.handoffPlan!}
                  streakDays={STREAK_DAYS}
                  checkInResponse={checkInResponse}
                  onCheckIn={() => setCheckInOpen(true)}
                  onShowGuide={setActiveGuide}
                />
              ) : null}
              {tab === 'plan' ? (
                <PlanTab
                  plan={state.handoffPlan!}
                  explainer={state.explainer}
                  onExplainerLoaded={setExplainer}
                />
              ) : null}
              {tab === 'progress' ? (
                <ProgressTab
                  readings={state.glucoseReadings}
                  target={state.handoffPlan!.glucoseTarget}
                  glucoseResult={glucoseResult}
                  onLog={() => setGlucoseOpen(true)}
                />
              ) : null}
              {tab === 'inbox' ? <InboxTab messages={state.patientInbox} /> : null}
            </div>
            <PatientTabBar tab={tab} onChange={openTab} alert={hasUnread ? 'inbox' : null} />
          </>
        )}

        {checkInOpen ? (
          <CheckInSheet
            onClose={() => setCheckInOpen(false)}
            onSubmitted={(r) => {
              setCheckInResponse(r);
              setCheckInOpen(false);
              setTab('today');
            }}
          />
        ) : null}

        {glucoseOpen ? (
          <GlucoseSheet
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

function WaitingState({
  name,
  onProceed,
  sending,
}: {
  name: string;
  onProceed: () => void;
  sending: boolean;
}) {
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
        Your review is with your clinician. The moment they send your plan, it appears here —
        everything you talked about, ready to follow.
      </p>
      <Button
        onPress={onProceed}
        isDisabled={sending}
        className="mt-7 rounded-2xl bg-mint px-6 py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
      >
        {sending ? 'Receiving…' : 'See my plan →'}
      </Button>
      <p className="mt-2 text-[12px] text-slate/70">Demo · simulates the clinician sending</p>
    </div>
  );
}
