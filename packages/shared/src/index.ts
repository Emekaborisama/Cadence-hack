/**
 * Shared types for the Cadence monorepo.
 * Imported by both the web PWA and the Node API so the chat contract
 * stays in sync across the wire.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** POST /api/chat request body. */
export interface ChatRequest {
  messages: ChatMessage[];
}

/** POST /api/chat response body. */
export interface ChatResponse {
  message: ChatMessage;
  model: string;
}

/** Standard error shape returned by the API. */
export interface ApiError {
  error: string;
}

export const DEFAULT_MODEL = 'gpt-4o-mini';
