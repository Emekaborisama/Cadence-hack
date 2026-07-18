import type {
  AppState,
  CheckIn,
  LogType,
  PatientRecord,
  PlanPatch,
  StateAction,
} from '@cadence/shared';

export type ClientState = AppState & { aiMode?: string };

async function postState(body: StateAction): Promise<ClientState> {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchState(): Promise<ClientState> {
  const res = await fetch('/api/state', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load state');
  return res.json();
}

// Look a patient record up by its clinician-issued code (case-insensitive).
export function findRecord(
  state: ClientState | null,
  patientId: string | null,
): PatientRecord | null {
  if (!state || !patientId) return null;
  return (
    state.records.find((r) => r.id.toUpperCase() === patientId.toUpperCase()) ??
    null
  );
}

// Adherence-coach flow (legacy demo surface).
export const onboard = () => postState({ action: 'onboard' });
export const sendCoach = (text: string) => postState({ action: 'coach', text });
export const resolveEscalation = (escalationId: string, note?: string) =>
  postState({ action: 'resolve', escalationId, note });
export const logEntry = (
  type: LogType,
  payload?: Record<string, unknown>,
  severity?: 'mild' | 'moderate' | 'severe',
) => postState({ action: 'log', type, payload, severity });

// Consult-to-home handoff flow (multi-patient).
export const resetDemo = () => postState({ action: 'reset' });
export const createPatient = (name: string, details?: string) =>
  postState({ action: 'createPatient', name, details });
export const extractPlan = (patientId: string, transcript: string) =>
  postState({ action: 'extract', patientId, transcript });
export const sendPlan = (patientId: string, plan?: PlanPatch) =>
  postState({ action: 'sendPlan', patientId, plan });
export const patientOnboard = (
  patientId: string,
  profile: {
    name: string;
    consentGiven: boolean;
    remindersEnabled: boolean;
    injectionDay?: string;
  },
) => postState({ action: 'patientOnboard', patientId, profile });
export const explain = (patientId: string, concept?: string) =>
  postState({ action: 'explain', patientId, concept });
export const submitCheckIn = (patientId: string, checkIn: CheckIn) =>
  postState({ action: 'checkIn', patientId, checkIn });
export const logGlucose = (
  patientId: string,
  value: number,
  context: 'fasting' | 'post-meal',
) => postState({ action: 'logGlucose', patientId, value, context });
export const toggleTask = (patientId: string, taskId: string) =>
  postState({ action: 'toggleTask', patientId, taskId });
export const markRead = (id: string) => postState({ action: 'markRead', id });
