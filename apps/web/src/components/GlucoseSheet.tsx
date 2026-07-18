import { useState } from 'react';
import { Button } from '@heroui/react';
import type { CheckInResponse } from '@cadence/shared';
import { logGlucose } from '../api.js';

export default function GlucoseSheet({
  patientId,
  onClose,
  onLogged,
}: {
  patientId: string;
  onClose: () => void;
  onLogged: (response: CheckInResponse) => void;
}) {
  const [value, setValue] = useState('6.9');
  const [context, setContext] = useState<'fasting' | 'post-meal'>('fasting');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const state = await logGlucose(patientId, Number(value), context);
      const record = state.records.find((r) => r.id === patientId);
      if (record?.latestResponse) onLogged(record.latestResponse);
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
          Log a glucose reading
        </h3>
        <p className="mt-1 text-[14px] leading-snug text-slate">
          We&rsquo;ll compare it to the target your clinician set.
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-2xl border border-hair bg-canvas px-4 py-3 text-[26px] font-semibold text-ink2 outline-none focus-visible:border-mint"
            style={{ fontFamily: 'var(--font-sora), sans-serif' }}
          />
          <span className="text-[15px] text-slate">mmol/L</span>
        </div>
        <div className="mt-2 flex gap-2">
          {['5.6', '6.9', '11.9'].map((v) => (
            <button
              key={v}
              onClick={() => setValue(v)}
              className="rounded-full bg-canvas px-3.5 py-1.5 text-[13px] font-medium text-slate hover:text-ink2"
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-slate">
          When
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {(['fasting', 'post-meal'] as const).map((c) => {
            const on = context === c;
            return (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`rounded-2xl border-2 px-3 py-3 text-[14px] font-semibold capitalize transition ${
                  on ? 'border-mint bg-mint-wash text-mint-strong' : 'border-hair bg-white text-slate'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-hair bg-white px-4 py-3.5 text-[15px] font-semibold text-slate hover:text-ink2"
          >
            Cancel
          </button>
          <Button
            onPress={submit}
            isDisabled={submitting || !value.trim()}
            className="flex-1 rounded-2xl bg-mint py-7 text-[15px] font-semibold text-ink2 data-[hovered=true]:opacity-90"
          >
            {submitting ? 'Saving…' : 'Save reading'}
          </Button>
        </div>
      </div>
    </div>
  );
}
