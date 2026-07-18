// Shared domain types for the Consult-to-Home Handoff Copilot.
// The AI never diagnoses — every field here captures and structures what the
// clinician said during the consult.

export interface Medication {
  id: string;
  name: string;
  dose: string;
  schedule: string; // when / how often, in plain language
  why: string; // the clinician's own words for why this is prescribed
  status: "continued" | "adjusted" | "new";
}

export interface TitrationStep {
  id: string;
  label: string; // e.g. "Weeks 1–4"
  dose: string;
  note?: string;
}

export interface LifestyleAction {
  id: string;
  title: string;
  detail: string;
  category: "monitoring" | "movement" | "diet" | "other";
}

export interface RedFlag {
  id: string;
  symptom: string;
  action: string; // what the patient should do if it happens
}

export interface Appointment {
  id: string;
  title: string;
  when: string;
}

// A clinician-authored response the app hands over when a patient check-in
// matches its trigger. The AI never writes these at runtime — it only matches
// the report to the right card and decides whether to escalate.
export interface ProtocolCard {
  id: string;
  trigger: string; // keyword the patient's symptom is matched against
  label: string; // display name, e.g. "Nausea (early weeks)"
  steps: string[]; // clinician-approved self-care steps
  escalateWhen: string; // plain-language threshold for looping in the team
}

// Target range the clinician set for at-home glucose monitoring (mmol/L).
export interface GlucoseTarget {
  low: number;
  high: number;
}

export interface CarePlan {
  patientName: string;
  condition: string;
  summary: string; // one-line, plain-language recap of the review
  medications: Medication[];
  titrationSteps: TitrationStep[];
  lifestyleActions: LifestyleAction[];
  redFlags: RedFlag[];
  appointments: Appointment[];
  protocols: ProtocolCard[]; // clinician-authored check-in responses
  glucoseTarget: GlucoseTarget; // clinician-set monitoring thresholds
}

// A partial patch applied to the assembling plan during the live stream.
export type PlanPatch = Partial<CarePlan>;

// Timed extraction event: at this word index in the stream, merge this patch
// into the sidebar plan so it "assembles itself" as the clinician speaks.
export interface ExtractionEvent {
  atWordIndex: number;
  label: string; // short caption shown when the event fires
  planPatch: PlanPatch;
}

export type CheckInSeverity = "mild" | "moderate" | "severe";

export interface CheckIn {
  symptom: string;
  severity: CheckInSeverity;
  note?: string;
  loggedAt: string; // ISO timestamp
}

export interface CheckInResponse {
  message: string; // reassuring, plain-language opener
  protocolSteps: string[]; // clinician-approved self-care steps
  escalate: boolean; // true => care team is notified
  escalationNote?: string; // what the patient is told about escalation
}

// An at-home glucose reading the patient logs between visits.
export interface GlucoseReading {
  id: string;
  value: number; // mmol/L
  context: "fasting" | "post-meal";
  loggedAt: string; // ISO timestamp
  flagged: boolean; // crossed the clinician-set threshold
}

// Plain-language read-out of the glucose trend — the "complex data into simple
// advice" job, computed deterministically so the demo never breaks.
export interface GlucoseTrend {
  direction: "down" | "up" | "steady";
  readOut: string;
  latest: number | null;
  inRangePct: number; // % of readings within target
}

// One entry in the clinician's between-visit inbox. The source is either a
// symptom check-in or a flagged glucose reading.
export interface InboxItem {
  id: string;
  kind: "check-in" | "glucose";
  checkIn?: CheckIn;
  reading?: GlucoseReading;
  response: CheckInResponse;
  read: boolean;
}

// The full shared demo state, polled by both surfaces.
export interface AppState {
  planSent: boolean;
  plan: CarePlan | null;
  latestResponse: CheckInResponse | null; // last response shown to the patient
  glucoseReadings: GlucoseReading[];
  inbox: InboxItem[];
  updatedAt: number;
}
