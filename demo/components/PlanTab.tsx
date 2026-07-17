import type { CarePlan, LifestyleAction } from "@/lib/types";
import MedicationCard from "./MedicationCard";
import TitrationTimeline from "./TitrationTimeline";

const delay = (i: number) => ({ animationDelay: `${i * 80}ms` });

const CATEGORY_LABEL: Record<LifestyleAction["category"], string> = {
  monitoring: "Track",
  movement: "Move",
  diet: "Eat",
  other: "Do",
};

// The full reference plan — what was captured from the consult, ready to follow.
export default function PlanTab({ plan }: { plan: CarePlan }) {
  return (
    <div className="px-5 pb-6 pt-5">
      <header className="reveal" style={delay(0)}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
          Your care plan
        </div>
        <h1 className="mt-1 font-serif text-2xl font-medium text-ink">
          Everything from today
        </h1>
      </header>

      <Section index={1} eyebrow="What to take" title="Your medicines">
        <div className="space-y-3">
          {plan.medications.map((m) => (
            <MedicationCard key={m.id} med={m} />
          ))}
        </div>
      </Section>

      {plan.titrationSteps.length ? (
        <Section
          index={2}
          eyebrow="Building up safely"
          title="Your semaglutide, week by week"
        >
          <div className="glass rounded-2xl p-5">
            <TitrationTimeline steps={plan.titrationSteps} />
          </div>
        </Section>
      ) : null}

      <Section index={3} eyebrow="Every day" title="Small actions that add up">
        <div className="space-y-2.5">
          {plan.lifestyleActions.map((a) => (
            <div
              key={a.id}
              className="flex gap-3 glass rounded-2xl p-4"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-care-wash px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-care-strong">
                {CATEGORY_LABEL[a.category]}
              </span>
              <div>
                <div className="text-[15px] font-medium text-ink">{a.title}</div>
                <div className="text-[13px] leading-snug text-muted">
                  {a.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section index={4} eyebrow="Just in case" title="When to get help">
        <div className="space-y-2.5">
          {plan.redFlags.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-clay/20 bg-clay-wash p-4"
            >
              <div className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay" />
                <div>
                  <div className="text-[15px] font-semibold text-clay">
                    {f.symptom}
                  </div>
                  <div className="text-[13px] leading-snug text-ink/70">
                    {f.action}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {plan.appointments.length ? (
        <Section index={5} eyebrow="Next" title="Your follow-up">
          {plan.appointments.map((a) => (
            <div
              key={a.id}
              className="glass rounded-2xl p-4"
            >
              <div className="text-[15px] font-medium text-ink">{a.title}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-muted">
                {a.when}
              </div>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-care/30 bg-care-wash px-3 py-1.5 text-[13px] font-semibold text-care-strong hover:bg-care-wash/70"
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
  eyebrow,
  title,
  children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="reveal mt-6" style={delay(index)}>
      <div className="mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
          {eyebrow}
        </div>
        <h2 className="font-serif text-xl font-medium text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
