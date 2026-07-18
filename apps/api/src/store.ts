import type {
  AppState,
  Escalation,
  GameState,
  LogEntry,
  CoachMessage,
  CarePlan,
  InboxItem,
  PatientMessage,
  PatientRecord,
} from '@cadence/shared';
import { MEERA } from './fixtures/patient.js';
import { INITIAL_GAME } from './fixtures/game.js';
import { loadPersistedState, persistState } from './db.js';

function freshState(): AppState {
  return {
    onboarded: false,
    patient: MEERA,
    plan: null,
    logs: [],
    game: structuredClone(INITIAL_GAME),
    coachThread: [
      {
        id: 'msg-welcome',
        threadId: 'thread-meera',
        role: 'coach',
        text: `Hi ${MEERA.name} — I'm ${MEERA.coachName}, your coach. I'll walk you through week one and pull guidance from your care team's protocols when you have a medical question.`,
        timestamp: new Date().toISOString(),
      },
    ],
    escalations: [],
    latestReview: null,
    records: [],
    inbox: [],
    updatedAt: Date.now(),
  };
}

const globalStore = globalThis as unknown as { __cadenceState?: AppState };

if (!globalStore.__cadenceState) {
  // Hydrate from SQLite so state survives restarts; merge over freshState so
  // fields added after the row was written are never undefined.
  const persisted = loadPersistedState();
  globalStore.__cadenceState = persisted
    ? { ...freshState(), ...persisted }
    : freshState();
  persistState(globalStore.__cadenceState);
}

export function getState(): AppState {
  return globalStore.__cadenceState!;
}

export function resetState(): AppState {
  globalStore.__cadenceState = freshState();
  persistState(globalStore.__cadenceState);
  return globalStore.__cadenceState;
}

export function setState(patch: Partial<AppState>): AppState {
  globalStore.__cadenceState = {
    ...getState(),
    ...patch,
    updatedAt: Date.now(),
  };
  persistState(globalStore.__cadenceState);
  return globalStore.__cadenceState;
}

export function setPlan(plan: CarePlan): AppState {
  return setState({ plan, onboarded: true });
}

export function addLog(entry: LogEntry): AppState {
  const state = getState();
  return setState({ logs: [...state.logs, entry] });
}

export function setGame(game: GameState): AppState {
  return setState({ game });
}

export function addCoachMessage(msg: CoachMessage): AppState {
  const state = getState();
  return setState({ coachThread: [...state.coachThread, msg] });
}

export function addEscalation(esc: Escalation): AppState {
  const state = getState();
  return setState({ escalations: [esc, ...state.escalations] });
}

export function updateEscalation(
  id: string,
  patch: Partial<Escalation>,
): AppState {
  const state = getState();
  return setState({
    escalations: state.escalations.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
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

// ── Patient records (multi-patient handoff) ────────────────────────────────

export function addRecord(record: PatientRecord): AppState {
  const state = getState();
  return setState({ records: [record, ...state.records] });
}

export function getRecord(patientId: string): PatientRecord | undefined {
  return getState().records.find(
    (r) => r.id.toUpperCase() === patientId.toUpperCase(),
  );
}

export function updateRecord(
  patientId: string,
  patch: Partial<PatientRecord>,
): AppState {
  const state = getState();
  return setState({
    records: state.records.map((r) =>
      r.id.toUpperCase() === patientId.toUpperCase() ? { ...r, ...patch } : r,
    ),
  });
}

export function addPatientMessage(
  patientId: string,
  msg: PatientMessage,
): AppState {
  const record = getRecord(patientId);
  if (!record) return getState();
  return updateRecord(patientId, { inbox: [msg, ...record.inbox] });
}
