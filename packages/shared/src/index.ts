/**
 * Cadence shared contract — imported by web + API.
 * Lock these shapes; all surfaces read/write against them.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
  model: string;
}

export interface ApiError {
  error: string;
}

export const DEFAULT_MODEL = 'gpt-4o-mini';

/** Seed patient + medication + labs. */
export interface Patient {
  id: string;
  name: string;
  condition: string;
  medication: {
    name: string;
    currentDose: string;
    schedule: string;
    titrationPlan: { label: string; dose: string; note?: string }[];
  };
  baselineLabs: {
    a1c: number;
    lipids: string;
    weightKg: number;
  };
  goals: string[];
  coachName: string;
}

export interface CarePlan {
  patientId: string;
  weekNumber: number;
  proteinTargetG: number;
  stepTarget: number;
  calorieRange: { min: number; max: number };
  dailyActions: { id: string; title: string; detail: string; when: string }[];
  titrationTimeline: { label: string; dose: string; note?: string }[];
  summary: string;
  generatedAt: string;
  constraints: {
    calorieFloor: number;
    proteinFloor: number;
    maxLossRatePerWeekKg: number;
  };
}

export interface ProtocolCard {
  id: string;
  topic: string;
  matchTriggers: string[];
  patientFacingGuidance: string[];
  escalates: boolean;
  escalationThreshold: 'moderate' | 'severe' | 'always';
  label: string;
}

export type LogType = 'injection' | 'meal' | 'symptom' | 'biomarker';

export interface LogEntry {
  id: string;
  patientId: string;
  type: LogType;
  payload: Record<string, unknown>;
  timestamp: string;
  reviewed: boolean;
  aiFeedback?: string;
}

export interface GameState {
  streaks: { injection: number; logging: number };
  points: number;
  level: number;
  activeQuests: { id: string; title: string; progress: number; goal: number }[];
  nonScaleVictories: string[];
  streakRepairUsed: boolean;
}

export type CoachRole = 'patient' | 'coach' | 'rd';

export interface CoachMessage {
  id: string;
  threadId: string;
  role: CoachRole;
  text: string;
  sourceProtocolId?: string;
  timestamp: string;
}

export type EscalationStatus = 'open' | 'acknowledged' | 'resolved';

export interface Escalation {
  id: string;
  patientId: string;
  reason: string;
  triggeredBy: string;
  aiSnapshot: string;
  status: EscalationStatus;
  createdAt: string;
  clinicianNote?: string;
}

import type {
  CheckIn,
  CheckInResponse,
  Explainer,
  GlucoseReading,
  HandoffPlan,
  InboxItem,
  PatientMessage,
  PatientProfile,
  PlanPatch,
} from './handoff.js';

export * from './handoff.js';

export interface AppState {
  onboarded: boolean;
  patient: Patient;
  plan: CarePlan | null;
  logs: LogEntry[];
  game: GameState;
  coachThread: CoachMessage[];
  escalations: Escalation[];
  latestReview: string | null;
  // Consult-to-home handoff surface (the design flow).
  planSent: boolean;
  draftPlan: HandoffPlan | null; // AI-extracted, awaiting clinician review — never patient-visible
  handoffPlan: HandoffPlan | null;
  latestResponse: CheckInResponse | null; // last check-in/glucose response shown to the patient
  glucoseReadings: GlucoseReading[];
  inbox: InboxItem[]; // clinician's between-visit inbox
  patientInbox: PatientMessage[]; // patient's messages from the care team
  patientProfile: PatientProfile | null; // set by patient onboarding; consent lives here
  explainer: Explainer | null; // cached "explain it simpler" levels for the current plan
  updatedAt: number;
}

export type StateAction =
  | { action: 'onboard' }
  | { action: 'coach'; text: string }
  | {
      action: 'log';
      type: LogType;
      payload?: Record<string, unknown>;
      severity?: 'mild' | 'moderate' | 'severe';
    }
  | { action: 'resolve'; escalationId: string; note?: string }
  | { action: 'extract'; transcript: string }
  | { action: 'sendPlan'; plan?: PlanPatch; transcript?: string }
  | {
      action: 'patientOnboard';
      profile: {
        name: string;
        consentGiven: boolean;
        remindersEnabled: boolean;
        injectionDay?: string;
      };
    }
  | { action: 'explain'; concept?: string }
  | { action: 'checkIn'; checkIn: CheckIn }
  | { action: 'logGlucose'; value: number; context?: 'fasting' | 'post-meal' }
  | { action: 'markRead'; id: string }
  | { action: 'reset' };
