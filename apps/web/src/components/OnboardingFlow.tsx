import { useState } from 'react';
import { Button } from '@heroui/react';
import { patientOnboard } from '../api.js';
import type { ClientState } from '../api.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Patient onboarding — welcome → details + consent. Consent is the load-
// bearing step: the entire care-team data flow exists because it was granted.
export default function OnboardingFlow({
  patientId,
  defaultName,
  onDone,
}: {
  patientId: string;
  defaultName: string;
  onDone: (state: ClientState) => void;
}) {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState(defaultName);
  const [consent, setConsent] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [injectionDay, setInjectionDay] = useState('Sun');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const state = await patientOnboard(patientId, {
        name,
        consentGiven: consent,
        remindersEnabled: reminders,
        injectionDay,
      });
      onDone(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center px-8 text-center"
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <div className="reveal relative mb-7 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-mint/15" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-mint-wash">
            <span className="h-3.5 w-3.5 rounded-full bg-mint" />
          </span>
        </div>
        <h1
          className="reveal text-[28px] font-semibold leading-tight text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Care that follows
          <br />
          you home
        </h1>
        <p className="reveal mt-3 max-w-[280px] text-[15px] leading-relaxed text-slate">
          Cadence turns your consultation into a plan you can actually follow — and keeps your
          care team close between visits.
        </p>
        <ul className="reveal mt-6 space-y-2.5 text-left">
          {[
            'Your plan, in plain language',
            'Check-ins that reach your care team',
            'Your readings, understood',
          ].map((line) => (
            <li key={line} className="flex items-center gap-2.5 text-[14px] text-ink2/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint-wash text-[11px] font-bold text-mint-strong">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
        <Button
          onPress={() => setStep(1)}
          className="mt-8 w-full max-w-[280px] rounded-2xl bg-mint py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
        >
          Get started
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-6"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      <div className="reveal">
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          About you
        </div>
        <h2
          className="mt-1 text-[26px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Set up your Cadence
        </h2>
      </div>

      <label className="reveal mt-5 block">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-slate">
          Your name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-hair bg-white px-4 py-3 text-[16px] font-medium text-ink2 outline-none focus-visible:border-mint"
        />
      </label>

      <div className="reveal mt-4">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-slate">
          Weekly injection day
        </span>
        <div className="mt-1.5 grid grid-cols-7 gap-1">
          {DAYS.map((d) => {
            const on = injectionDay === d;
            return (
              <button
                key={d}
                onClick={() => setInjectionDay(d)}
                className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                  on ? 'bg-mint text-ink2' : 'bg-white text-slate border border-hair'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* consent — the load-bearing toggle */}
      <button
        onClick={() => setConsent((v) => !v)}
        className={`reveal mt-5 flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
          consent ? 'border-mint bg-mint-wash' : 'border-hair bg-white'
        }`}
      >
        <span
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-[13px] font-bold ${
            consent ? 'border-mint bg-mint text-ink2' : 'border-hair text-transparent'
          }`}
        >
          ✓
        </span>
        <span>
          <span className="block text-[14.5px] font-semibold text-ink2">
            Share my check-ins and readings with my care team
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-slate">
            Required. Cadence only works because your care team can see what you log — you can
            withdraw consent at any time in settings.
          </span>
        </span>
      </button>

      <button
        onClick={() => setReminders((v) => !v)}
        className="reveal mt-3 flex items-center justify-between rounded-2xl border border-hair bg-white p-4 text-left"
      >
        <span>
          <span className="block text-[14.5px] font-semibold text-ink2">Daily reminders</span>
          <span className="block text-[12.5px] text-slate">Medication and check-in nudges</span>
        </span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            reminders ? 'bg-mint' : 'bg-hair'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              reminders ? 'left-6' : 'left-1'
            }`}
          />
        </span>
      </button>

      {error ? <p className="mt-3 text-[13px] font-medium text-blush">{error}</p> : null}

      <div className="mt-auto pt-6">
        <Button
          onPress={submit}
          isDisabled={submitting || !consent || !name.trim()}
          className="w-full rounded-2xl bg-mint py-6 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-hair data-[disabled=true]:text-slate"
        >
          {submitting ? 'Setting up…' : 'Continue'}
        </Button>
        {!consent ? (
          <p className="mt-2 text-center text-[12px] text-slate/80">
            Tick the sharing consent to continue
          </p>
        ) : null}
      </div>
    </div>
  );
}
