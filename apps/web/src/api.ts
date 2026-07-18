import type {
  AppState,
  CheckIn,
  LogType,
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

export const onboard = () => postState({ action: 'onboard' });
export const resetDemo = () => postState({ action: 'reset' });
export const sendCoach = (text: string) => postState({ action: 'coach', text });
export const resolveEscalation = (escalationId: string, note?: string) =>
  postState({ action: 'resolve', escalationId, note });

export const logEntry = (
  type: LogType,
  payload?: Record<string, unknown>,
  severity?: 'mild' | 'moderate' | 'severe',
) => postState({ action: 'log', type, payload, severity });

// Consult-to-home handoff actions (the design flow).
export const extractPlan = (transcript: string) =>
  postState({ action: 'extract', transcript });
export const sendPlan = (plan?: PlanPatch, transcript?: string) =>
  postState({ action: 'sendPlan', plan, transcript });
export const submitCheckIn = (checkIn: CheckIn) =>
  postState({ action: 'checkIn', checkIn });
export const logGlucose = (value: number, context: 'fasting' | 'post-meal') =>
  postState({ action: 'logGlucose', value, context });
export const markRead = (id: string) => postState({ action: 'markRead', id });
export const patientOnboard = (profile: {
  name: string;
  consentGiven: boolean;
  remindersEnabled: boolean;
  injectionDay?: string;
}) => postState({ action: 'patientOnboard', profile });
export const explain = (concept?: string) => postState({ action: 'explain', concept });
