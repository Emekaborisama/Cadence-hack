import { useState } from 'react';
import { Button } from '@heroui/react';
import type { CheckIn, CheckInResponse, CheckInSeverity } from '@cadence/shared';
import { submitCheckIn } from '../api.js';

const SYMPTOMS = ['Nausea', 'Headache', 'Low energy', 'Feeling good'];

const SEVERITIES: { id: CheckInSeverity; label: string }[] = [
  { id: 'mild', label: 'A little' },
  { id: 'moderate', label: 'Quite a bit' },
  { id: 'severe', label: 'A lot' },
];

// Simple expressive face per severity — visual, not a form field.
function Face({ level, active }: { level: CheckInSeverity; active: boolean }) {
  const stroke = active ? '#b45309' : '#8a92a0';
  const mouth =
    level === 'mild'
      ? 'M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8'
      : level === 'moderate'
        ? 'M8.5 15h7'
        : 'M8.5 15.6c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8';
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="9" cy="10.5" r="0.4" fill={stroke} />
      <circle cx="15" cy="10.5" r="0.4" fill={stroke} />
      <path d={mouth} />
    </svg>
  );
}

export default function CheckInSheet({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (response: CheckInResponse) => void;
}) {
  const [symptom, setSymptom] = useState('Nausea');
  const [severity, setSeverity] = useState<CheckInSeverity>('moderate');
  const [note, setNote] = useState('Feeling queasy since starting the injection.');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const checkIn: CheckIn = {
      symptom,
      severity,
      note: note.trim() || undefined,
      loggedAt: new Date().toISOString(),
    };
    try {
      const state = await submitCheckIn(checkIn);
      if (state.latestResponse) onSubmitted(state.latestResponse);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-end bg-[rgba(23,26,31,0.32)]"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      <div className="rounded-t-[28px] border-t border-white bg-white p-5 pb-6 shadow-[0_-24px_50px_-20px_rgba(23,26,31,0.35)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-hair" />
        <h3
          className="text-[22px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          How are you feeling?
        </h3>
        <p className="mt-1 text-[14px] leading-snug text-slate">
          A quick tap. Your care team&rsquo;s guidance comes right back.
        </p>

        {/* symptom chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => {
            const on = symptom === s;
            return (
              <button
                key={s}
                onClick={() => setSymptom(s)}
                className={`rounded-full px-3.5 py-2 text-[14px] font-medium transition ${
                  on ? 'bg-mint text-ink2' : 'bg-canvas text-slate hover:text-ink2'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* severity faces */}
        <div className="mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-slate">
          How much?
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2.5">
          {SEVERITIES.map((s) => {
            const on = severity === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSeverity(s.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 transition ${
                  on ? 'border-mint bg-mint-wash' : 'border-hair bg-white'
                }`}
              >
                <Face level={s.id} active={on} />
                <span
                  className={`text-[13px] font-semibold ${on ? 'text-mint-strong' : 'text-slate'}`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* optional note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything else? (optional)"
          className="mt-4 w-full rounded-2xl border border-hair bg-canvas px-4 py-3 text-[15px] text-ink2 outline-none placeholder:text-slate/70 focus-visible:border-mint"
        />

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-hair bg-white px-4 py-3.5 text-[15px] font-semibold text-slate hover:text-ink2"
          >
            Not now
          </button>
          <Button
            onPress={submit}
            isDisabled={submitting}
            className="flex-1 rounded-2xl bg-mint py-7 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
          >
            {submitting ? 'Sending…' : 'Send to my care team'}
          </Button>
        </div>
      </div>
    </div>
  );
}
