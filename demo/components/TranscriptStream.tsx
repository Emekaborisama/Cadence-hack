// Presentational transcript pane. Receives the portion of the scripted consult
// that has "streamed" so far and shows a live cursor while streaming.
export default function TranscriptStream({
  text,
  streaming,
  started,
}: {
  text: string;
  streaming: boolean;
  started: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-care">
            Live consultation
          </div>
          <div className="font-serif text-lg font-medium text-ink">
            Transcript
          </div>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            streaming
              ? "bg-clay-wash text-clay"
              : started
                ? "bg-care-wash text-care-strong"
                : "bg-paper-2 text-muted"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              streaming ? "animate-pulse bg-clay" : started ? "bg-care" : "bg-muted/50"
            }`}
          />
          {streaming ? "Recording" : started ? "Ended" : "Not started"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 text-[15px] leading-relaxed text-ink/80">
        {started ? (
          <p className="whitespace-pre-wrap">
            {text}
            {streaming ? (
              <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse bg-care align-middle" />
            ) : null}
          </p>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-care-wash">
              <span className="h-2.5 w-2.5 rounded-full bg-care" />
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-muted">
              Press <span className="font-medium text-ink">Start consult</span>{" "}
              to begin the session. Nothing here is typed. The plan on the right
              assembles itself as the clinician speaks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
