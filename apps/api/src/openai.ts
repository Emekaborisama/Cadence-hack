import OpenAI from 'openai';
import type { ChatMessage } from '@cadence/shared';
import { env } from './env.js';

/**
 * The LLM layer. Wraps the OpenAI client so the rest of the app depends on
 * a small, swappable interface rather than the SDK directly.
 */
const client = new OpenAI({ apiKey: env.openaiApiKey });

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  const completion = await client.chat.completions.create({
    model: env.model,
    messages,
  });

  return completion.choices[0]?.message?.content ?? '';
}

export const activeModel = env.model;
