import type { ChatMessage, ChatRequest, ChatResponse } from '@cadence/shared';

/**
 * Thin client for the Cadence API. In dev the Vite proxy forwards `/api`
 * to the Node server (see vite.config.ts).
 */
export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const body: ChatRequest = { messages };
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<ChatResponse>;
}
