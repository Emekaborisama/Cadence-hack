import { Button } from '@heroui/react';
import type { CheckInSeverity, InboxItem } from '@cadence/shared';

const SEVERITY_STYLE: Record<CheckInSeverity, string> = {
  mild: 'bg-mint-wash text-mint-strong',
  moderate: 'bg-ochre-wash text-ochre',
  severe: 'bg-clay-wash text-clay',
};

// The clinician's between-visit inbox: patient check-ins that tripped a
// threshold surface here with context — the closed loop.
export default function InboxPanel({
  items,
  onMarkRead,
}: {
  items: InboxItem[];
  onMarkRead: (id: string) => void;
}) {
  const unread = items.filter((i) => !i.read).length;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Between visits
          </div>
          <div className="font-serif text-lg font-medium text-ink">Patient inbox</div>
        </div>
        {unread > 0 ? (
          <span className="rounded-full bg-clay px-2.5 py-1 text-xs font-semibold text-white">
            {unread} new
          </span>
        ) : (
          <span className="text-[13px] text-muted">No new flags</span>
        )}
      </div>
      <div className="divide-y divide-line">
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-muted">
            Nothing here yet. When Meera logs how she&apos;s feeling and it crosses a threshold,
            it appears here with context.
          </p>
        ) : (
          items.map((item) => {
            const isGlucose = item.kind === 'glucose';
            const title = isGlucose ? `Glucose ${item.reading?.value} mmol/L` : item.checkIn?.symptom;
            const tag = isGlucose ? item.reading?.context : item.checkIn?.severity;
            const tagStyle = isGlucose
              ? 'bg-clay-wash text-clay'
              : SEVERITY_STYLE[item.checkIn?.severity ?? 'mild'];
            const loggedAt = isGlucose ? item.reading?.loggedAt : item.checkIn?.loggedAt;
            return (
              <div key={item.id} className={`px-5 py-4 ${item.read ? 'opacity-55' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">{title}</span>
                    {tag ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${tagStyle}`}
                      >
                        {tag}
                      </span>
                    ) : null}
                  </div>
                  {!item.read ? (
                    <Button
                      onPress={() => onMarkRead(item.id)}
                      className="min-w-0 rounded-lg bg-mint-wash px-3 py-3 text-[13px] font-semibold text-mint-strong data-[hovered=true]:opacity-90"
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
                {item.checkIn?.note ? (
                  <p className="mt-1.5 font-serif text-[15px] italic text-ink/75">
                    &ldquo;{item.checkIn.note}&rdquo;
                  </p>
                ) : null}
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {isGlucose
                    ? 'Above the threshold you set.'
                    : 'Companion served the approved protocol.'}
                  {item.response.escalate ? (
                    <span className="font-medium text-clay">Escalated to you.</span>
                  ) : (
                    <span>No escalation.</span>
                  )}
                </p>
                {loggedAt ? (
                  <p className="mt-1 text-[11px] text-muted/70">
                    {new Date(loggedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
