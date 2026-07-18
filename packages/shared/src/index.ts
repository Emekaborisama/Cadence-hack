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

import type { CheckIn, InboxItem, PatientRecord, PlanPatch } from './handoff.js';

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
  // Consult-to-home handoff surface (the design flow), multi-patient:
  // clinician-created records keyed by a short patient code.
  records: PatientRecord[];
  inbox: InboxItem[]; // clinician's between-visit inbox, across all patients
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
  | { action: 'createPatient'; name: string; details?: string }
  | { action: 'extract'; patientId: string; transcript: string }
  | { action: 'sendPlan'; patientId: string; plan?: PlanPatch }
  | {
      action: 'patientOnboard';
      patientId: string;
      profile: {
        name: string;
        consentGiven: boolean;
        remindersEnabled: boolean;
        injectionDay?: string;
      };
    }
  | { action: 'explain'; patientId: string; concept?: string }
  | { action: 'checkIn'; patientId: string; checkIn: CheckIn }
  | {
      action: 'logGlucose';
      patientId: string;
      value: number;
      context?: 'fasting' | 'post-meal';
    }
  | { action: 'toggleTask'; patientId: string; taskId: string }
  | { action: 'markRead'; id: string }
  | { action: 'reset' };
