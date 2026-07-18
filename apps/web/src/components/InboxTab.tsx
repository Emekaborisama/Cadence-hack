import type { PatientMessage } from '@cadence/shared';

const KIND_META: Record<PatientMessage['kind'], { label: string; tint: string; fg: string }> = {
  plan: { label: 'Care plan', tint: '#e4f6f2', fg: '#0e9c72' },
  'check-in': { label: 'Check-in reply', tint: '#fdf3df', fg: '#b45309' },
  glucose: { label: 'Glucose', tint: '#eaf1fb', fg: '#3b6bb0' },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString();
}

// The patient's inbox — every message the care team's system has sent them:
// the plan arriving, and each response to a check-in or glucose reading.
export default function InboxTab({ messages }: { messages: PatientMessage[] }) {
  return (
    <div className="px-5 pb-8 pt-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <header>
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
          From your care team
        </div>
        <h1
          className="mt-1 text-[28px] font-semibold text-ink2"
          style={{ fontFamily: 'var(--font-sora), sans-serif' }}
        >
          Inbox
        </h1>
      </header>

      {messages.length === 0 ? (
        <div className="mono-card mt-5 rounded-3xl p-6 text-center">
          <p className="text-[15px] leading-relaxed text-slate">
            Nothing yet. When your care team sends your plan or replies to a check-in, it lands
            here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {messages.map((m) => {
            const meta = KIND_META[m.kind];
            return (
              <li key={m.id} className="mono-card reveal rounded-3xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: meta.tint, color: meta.fg }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[11.5px] text-slate">{timeAgo(m.at)}</span>
                </div>
                <div
                  className="mt-2 text-[16px] font-semibold text-ink2"
                  style={{ fontFamily: 'var(--font-sora), sans-serif' }}
                >
                  {m.title}
                </div>
                <p className="mt-1 text-[14px] leading-snug text-ink2/80">{m.body}</p>
                {m.steps?.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {m.steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink2/75">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {m.escalated ? (
                  <p className="mt-2.5 rounded-xl bg-blush-wash px-3 py-2 text-[12.5px] font-medium text-blush">
                    Your care team has been notified and can see this.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
