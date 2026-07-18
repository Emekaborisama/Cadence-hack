import 'dotenv/config';
import { DEFAULT_MODEL } from '@cadence/shared';

export type AiMode = 'fixture' | 'live';

// Mode resolution: an explicit AI_MODE always wins; otherwise the presence of
// an OpenAI key means live. Fixture remains the zero-config default.
const explicit = process.env.AI_MODE?.toLowerCase() as AiMode | undefined;
// Accept both spellings — OPENAI_API_KEY (standard) and OPENAI_KEY.
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
const hasKey = Boolean(apiKey);
let mode: AiMode = explicit ?? (hasKey ? 'live' : 'fixture');

if (mode === 'live' && !hasKey) {
  // Never hard-fail on config — the demo must always boot. Run on fixtures
  // and say so loudly; add OPENAI_API_KEY to apps/api/.env to go live.
  console.warn(
    '[env] AI_MODE=live but OPENAI_API_KEY is missing — falling back to fixture mode.',
  );
  mode = 'fixture';
}

export const env = {
  aiMode: mode,
  openaiApiKey: apiKey,
  model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  port: Number(process.env.PORT) || 3001,
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
};
