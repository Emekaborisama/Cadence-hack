import type { AppState, GlucoseReading, InboxItem } from "./types";

// Module-level in-memory store for the demo. Persisted on globalThis so it
// survives Next.js dev hot-reloads (which re-evaluate modules). No DB — this is
// a hackathon prototype and resets on server restart or via /api/reset.

function freshState(): AppState {
  return {
    planSent: false,
    plan: null,
    latestResponse: null,
    glucoseReadings: [],
    inbox: [],
    updatedAt: Date.now(),
  };
}

const globalStore = globalThis as unknown as {
  __handoffState?: AppState;
};

if (!globalStore.__handoffState) {
  globalStore.__handoffState = freshState();
}

export function getState(): AppState {
  return globalStore.__handoffState!;
}

export function resetState(): AppState {
  globalStore.__handoffState = freshState();
  return globalStore.__handoffState;
}

export function setState(patch: Partial<AppState>): AppState {
  globalStore.__handoffState = {
    ...getState(),
    ...patch,
    updatedAt: Date.now(),
  };
  return globalStore.__handoffState;
}

export function addInboxItem(item: InboxItem): AppState {
  const state = getState();
  return setState({ inbox: [item, ...state.inbox] });
}

export function markInboxRead(id: string): AppState {
  const state = getState();
  return setState({
    inbox: state.inbox.map((i) => (i.id === id ? { ...i, read: true } : i)),
  });
}

export function addGlucoseReading(reading: GlucoseReading): AppState {
  const state = getState();
  return setState({ glucoseReadings: [...state.glucoseReadings, reading] });
}
