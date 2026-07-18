import OpenAI from 'openai';
import type { ChatMessage } from '@cadence/shared';
import { env } from './env.js';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!env.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: env.model,
    messages,
  });
  return completion.choices[0]?.message?.content ?? '';
}

export async function createJsonCompletion(
  system: string,
  user: string,
): Promise<unknown> {
  // No explicit temperature — newer models only accept the default, and the
  // strict JSON schema in the system prompt does the determinism work.
  const completion = await getClient().chat.completions.create({
    model: env.model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw);
}

export const activeModel = env.model;
