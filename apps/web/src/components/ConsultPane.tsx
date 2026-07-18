import { Button } from '@heroui/react';

// The clinician's consult pane — the real entry point. The clinician pastes
// the consult transcript (from their telehealth platform or ambient scribe) or
// their own notes; extraction runs on submit. After extraction the pane shows
// the source text the AI worked from, for side-by-side review.
export default function ConsultPane({
  phase,
  transcript,
  onTranscriptChange,
  onUseSample,
  sampleLabel = 'Use the sample consult',
  onExtract,
  extracting,
  error,
}: {
  phase: 'input' | 'readonly';
  transcript: string;
  onTranscriptChange: (v: string) => void;
  onUseSample: () => void;
  sampleLabel?: string;
  onExtract: () => void;
  extracting: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mint-strong">
            Consultation
          </div>
          <div className="font-serif text-lg font-medium text-ink">Transcript & notes</div>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            extracting
              ? 'bg-ochre-wash text-ochre'
              : phase === 'readonly'
                ? 'bg-mint-wash text-mint-strong'
                : 'bg-paper-2 text-muted'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              extracting ? 'animate-pulse bg-ochre' : phase === 'readonly' ? 'bg-mint' : 'bg-muted/50'
            }`}
          />
          {extracting ? 'Extracting…' : phase === 'readonly' ? 'Source of the plan' : 'Awaiting input'}
        </div>
      </div>

      {phase === 'input' ? (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <p className="text-[14px] leading-relaxed text-muted">
            Paste the consult transcript from your telehealth platform or scribe — or your own
            notes from the conversation. The AI structures it into a care plan for your review;
            nothing reaches the patient until you approve it.
          </p>
          <textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            placeholder={'Dr …: …\nPatient: …\n\nor free-form notes — medication changes, doses, lifestyle advice, follow-up.'}
            className="min-h-0 flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-3 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-muted/60 focus-visible:border-mint focus-visible:ring-2 focus-visible:ring-mint/20"
          />
          {error ? <p className="text-[13px] font-medium text-clay">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onUseSample}
              className="rounded-lg px-2 py-1 text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {sampleLabel}
            </button>
            <Button
              onPress={onExtract}
              isDisabled={extracting || !transcript.trim()}
              className="rounded-xl bg-mint px-5 py-5 text-sm font-semibold text-ink2 data-[hovered=true]:opacity-90 data-[disabled=true]:bg-line data-[disabled=true]:text-muted"
            >
              {extracting ? 'Extracting…' : 'Extract care plan'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5 text-[15px] leading-relaxed text-ink/80">
          <p className="whitespace-pre-wrap">{transcript}</p>
        </div>
      )}
    </div>
  );
}
