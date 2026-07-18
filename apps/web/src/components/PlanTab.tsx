import type { Explainer, HandoffPlan, LifestyleAction, Medication } from '@cadence/shared';
import { currentTitrationStepIndex } from '@cadence/shared';
import TitrationTimeline from './TitrationTimeline.js';
import SimplifyCard from './SimplifyCard.js';
import { downloadScheduleIcs } from '../lib/calendar.js';
import type { ReactNode } from 'react';

const delay = (i: number) => ({ animationDelay: `${i * 70}ms` });

function medObject(name: string): { obj: string; tint: string } {
  if (/semaglutide|ozempic|wegovy|glp/i.test(name))
    return { obj: 'semaglutide-pen.png', tint: '#e4f6f2' };
  return { obj: 'metformin-pill.png', tint: '#e8f1ff' };
}

const LIFE: Record<LifestyleAction['category'], { obj: string; tint: string }> = {
  monitoring: { obj: 'bp-cuff.png', tint: '#f0ecfb' },
  movement: { obj: 'walking-shoe.png', tint: '#e9f6ea' },
  diet: { obj: 'water-glass.png', tint: '#e6f2fd' },
  other: { obj: 'plate-veg.png', tint: '#fdeee0' },
};

const STATUS: Record<Medication['status'], { label: string; bg: string; fg: string }> = {
  continued: { label: 'Keep taking', bg: '#eef1f4', fg: '#5b6470' },
  adjusted: { label: 'Dose changed', bg: '#fdf3df', fg: '#b45309' },
  new: { label: 'New for you', bg: '#e4f6f2', fg: '#0e9c72' },
};

export default function PlanTab({
  patientId,
  plan,
  planSentAt,
  explainer,
  onExplainerLoaded,
  onReportSymptom,
}: {
  patientId: string;
  plan: HandoffPlan;
  planSentAt?: string;
  explainer: Explainer | null;
  onExplainerLoaded: (e: Explainer) => void;
  onReportSymptom: (symptom: string) => void;
}) {
  return (
    <div className="px-5 pb-8 pt-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <header className="reveal" style={delay(0)}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          Your care plan
        </div>
        <h1
          className="mt-1 text-[28px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Everything from today
        </h1>
      </header>

      <Section index={1} title="Your medicines">
        <div className="space-y-3">
          {(plan.medications ?? []).map((m) => {
            const o = medObject(m.name);
            const st = STATUS[m.status] ?? STATUS.continued;
            return (
              <div key={m.id} className="mono-card overflow-hidden rounded-3xl">
                <div className="flex items-center gap-3.5 p-2.5">
                  <span
                    className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-[20px]"
                    style={{ background: o.tint }}
                  >
                    <img
                      src={`/objects/${o.obj}`}
                      alt=""
                      className="h-[88px] w-[88px] object-contain mix-blend-multiply"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[16.5px] font-semibold text-ink2"
                        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
                      >
                        {m.name}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="text-[14px] font-medium text-ink2">{m.dose}</div>
                    <div className="text-[12.5px] text-slate">{m.schedule}</div>
                  </div>
                </div>
                <p className="border-t border-hair bg-[#fbfaf7] px-4 py-3 text-[13.5px] italic leading-snug text-mint-strong">
                  &ldquo;{m.why}&rdquo;
                  <span className="mt-1 block text-[11px] font-semibold uppercase not-italic tracking-wide text-slate">
                    from your clinician
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="reveal mt-4" style={delay(2)}>
        <SimplifyCard patientId={patientId} explainer={explainer} onLoaded={onExplainerLoaded} />
      </section>

      {plan.titrationSteps?.length ? (
        <Section index={2} title="Your medication, week by week">
          <div className="mono-card rounded-3xl p-5">
            <TitrationTimeline
              steps={plan.titrationSteps}
              currentIndex={currentTitrationStepIndex(plan.titrationSteps, planSentAt)}
            />
          </div>
        </Section>
      ) : null}

      <Section index={3} title="Everyday actions">
        <div className="space-y-2.5">
          {(plan.lifestyleActions ?? []).map((a) => {
            // Fallback keeps an out-of-enum category renderable, never a crash.
            const o = LIFE[a.category] ?? LIFE.other;
            return (
              <div key={a.id} className="mono-card flex items-center gap-3.5 rounded-3xl p-2.5">
                <span
                  className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl"
                  style={{ background: o.tint }}
                >
                  <img
                    src={`/objects/${o.obj}`}
                    alt=""
                    className="h-[64px] w-[64px] object-contain mix-blend-multiply"
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-ink2">{a.title}</div>
                  <div className="text-[13px] leading-snug text-slate">{a.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section index={4} title="When to get help">
        <div className="space-y-2.5">
          {(plan.redFlags ?? []).map((f) => (
            <button
              key={f.id}
              onClick={() => onReportSymptom(f.symptom)}
              className="block w-full rounded-3xl border border-[rgba(224,113,79,0.28)] bg-[#fbeadf] p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: '#e0714f' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold" style={{ color: '#c0492b' }}>
                    {f.symptom}
                  </div>
                  <div className="text-[13px] leading-snug text-ink2/70">{f.action}</div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold" style={{ color: '#c0492b' }}>
                    Experiencing this? Tap to tell your care team →
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {plan.appointments?.length ? (
        <Section index={5} title="Your follow-up">
          {plan.appointments.map((a) => (
            <div key={a.id} className="mono-card rounded-3xl p-4">
              <div className="text-[15px] font-semibold text-ink2">{a.title}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-slate">{a.when}</div>
              <button
                onClick={() => downloadScheduleIcs(plan.patientName)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint-wash px-3.5 py-1.5 text-[13px] font-semibold text-mint-strong"
              >
                <span aria-hidden>＋</span> Add to calendar
              </button>
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="reveal mt-6" style={delay(index)}>
      <h2
        className="mb-3 text-[17px] font-semibold text-ink2"
        style={{ fontFamily: 'var(--font-sora), sans-serif' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
