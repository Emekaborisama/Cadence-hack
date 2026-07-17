import 'dotenv/config';
import { DEFAULT_MODEL } from '@cadence/shared';

/**
 * Centralised, validated environment access.
 * Throws early with a clear message if the OpenAI key is missing.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy apps/api/.env.example to apps/api/.env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  openaiApiKey: required('OPENAI_API_KEY'),
  model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  port: Number(process.env.PORT) || 3001,
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()),
};
