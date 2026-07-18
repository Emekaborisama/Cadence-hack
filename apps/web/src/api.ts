import type {
  AppState,
  CheckIn,
  LogType,
  PatientRecord,
  PlanPatch,
  StateAction,
} from '@cadence/shared';

export type ClientState = AppState & { aiMode?: string };

// The ONLY shape the patient app ever receives: their own record, nothing
// else. Enforced server-side by the scope middleware.
export interface PatientView {
  patient: PatientRecord | null;
  aiMode?: string;
  updatedAt?: number;
}

const scopedUrl = (patientId: string) =>
  `/api/state?scope=patient&patientId=${encodeURIComponent(patientId)}`;

export async function fetchPatientView(patientId: string): Promise<PatientView> {
  const res = await fetch(scopedUrl(patientId), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load your record');
  return res.json();
}

async function postScoped(patientId: string, body: StateAction): Promise<PatientView> {
  const res = await fetch(scopedUrl(patientId), {
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

// Patient-scoped actions — all patient UI goes through these.
export const pOnboard = (
  patientId: string,
  profile: { name: string; consentGiven: boolean; remindersEnabled: boolean; injectionDay?: string },
) => postScoped(patientId, { action: 'patientOnboard', patientId, profile });
export const pCheckIn = (patientId: string, checkIn: CheckIn) =>
  postScoped(patientId, { action: 'checkIn', patientId, checkIn });
export const pLogGlucose = (patientId: string, value: number, context: 'fasting' | 'post-meal') =>
  postScoped(patientId, { action: 'logGlucose', patientId, value, context });
export const pToggleTask = (patientId: string, taskId: string) =>
  postScoped(patientId, { action: 'toggleTask', patientId, taskId });
export const pExplain = (patientId: string, concept?: string) =>
  postScoped(patientId, { action: 'explain', patientId, concept });

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
export const updatePatient = (patientId: string, patch: { name?: string; details?: string }) =>
  postState({ action: 'updatePatient', patientId, ...patch });
export const deletePatient = (patientId: string) =>
  postState({ action: 'deletePatient', patientId });
export const extractPlan = (patientId: string, transcript: string) =>
  postState({ action: 'extract', patientId, transcript });
export const sendPlan = (patientId: string, plan?: PlanPatch) =>
  postState({ action: 'sendPlan', patientId, plan });
export const markRead = (id: string) => postState({ action: 'markRead', id });
// NOTE: patient actions (onboard/check-in/glucose/tasks/explain) intentionally
// exist ONLY as scoped variants above — the patient surface must never receive
// the full state.
