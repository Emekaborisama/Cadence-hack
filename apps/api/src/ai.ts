import type {
  CarePlan,
  CheckIn,
  CheckInResponse,
  CoachMessage,
  HandoffPlan,
  LogEntry,
  Patient,
  ProtocolCard,
} from '@cadence/shared';
import type { Explainer } from '@cadence/shared';
import {
  CHECK_IN_RESPONSE_FIXTURE,
  EXPLAINER_FIXTURE,
  genericCheckInResponse,
  HANDOFF_PLAN_FIXTURE,
} from '@cadence/shared';
import { env } from './env.js';
import { WEEK_ONE_PLAN } from './fixtures/plan.js';
import { PROTOCOLS } from './fixtures/protocols.js';
import { createJsonCompletion } from './openai.js';

function validatePlanRails(plan: CarePlan): CarePlan {
  const next = { ...plan, calorieRange: { ...plan.calorieRange }, constraints: { ...plan.constraints } };
  if (next.calorieRange.min < next.constraints.calorieFloor) {
    next.calorieRange.min = next.constraints.calorieFloor;
  }
  if (next.proteinTargetG < next.constraints.proteinFloor) {
    next.proteinTargetG = next.constraints.proteinFloor;
  }
  return next;
}

export function matchProtocol(text: string): ProtocolCard | null {
  const lower = text.toLowerCase();
  return PROTOCOLS.find((p) => p.matchTriggers.some((t) => lower.includes(t))) ?? null;
}

function shouldEscalate(
  protocol: ProtocolCard | null,
  severity: 'mild' | 'moderate' | 'severe' = 'mild',
): boolean {
  if (!protocol) return true;
  if (protocol.escalationThreshold === 'always') return true;
  if (!protocol.escalates) return false;
  if (severity === 'severe') return true;
  if (protocol.escalationThreshold === 'moderate' && severity === 'moderate') {
    return true;
  }
  return false;
}

export async function generatePlan(patient: Patient): Promise<CarePlan> {
  if (env.aiMode === 'fixture') {
    return validatePlanRails({
      ...WEEK_ONE_PLAN,
      generatedAt: new Date().toISOString(),
    });
  }

  try {
    const result = (await createJsonCompletion(
      `You generate a week-one CarePlan for a GLP-1 patient. Never invent medical advice beyond diet/activity coaching.
Hard rails: calorieFloor >= 1400, proteinFloor >= 90, maxLossRatePerWeekKg <= 1.0.
Return JSON matching CarePlan fields.`,
      JSON.stringify(patient),
    )) as CarePlan;
    return validatePlanRails({
      ...result,
      patientId: patient.id,
      constraints: {
        ...result.constraints,
        calorieFloor: 1400,
        proteinFloor: 90,
        maxLossRatePerWeekKg: 1.0,
      },
    });
  } catch (err) {
    console.error('[ai] generatePlan fell back to fixture:', err);
    return validatePlanRails({
      ...WEEK_ONE_PLAN,
      generatedAt: new Date().toISOString(),
    });
  }
}

export interface CoachResult {
  message: CoachMessage;
  escalate: boolean;
  reason?: string;
}

function fixtureCoach(
  patient: Patient,
  text: string,
  severity?: 'mild' | 'moderate' | 'severe',
): CoachResult {
  const protocol = matchProtocol(text);
  const escalate = shouldEscalate(protocol, severity);
  const now = new Date().toISOString();

  if (protocol?.id === 'proto-emergency') {
    return {
      message: {
        id: `msg-${Date.now()}`,
        threadId: 'thread-meera',
        role: 'coach',
        text: ['This sounds urgent.', ...protocol.patientFacingGuidance].join(' '),
        sourceProtocolId: protocol.id,
        timestamp: now,
      },
      escalate: true,
      reason: 'Urgent symptom — seek emergency care',
    };
  }

  if (!protocol) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        threadId: 'thread-meera',
        role: 'coach',
        text: `I don't have an approved protocol for that exact question, so I'm looping in a human on your care team rather than guessing. ${patient.coachName} will stay with you — hang tight.`,
        timestamp: now,
      },
      escalate: true,
      reason: 'Unmatched question — no protocol card',
    };
  }

  const guidance = protocol.patientFacingGuidance.map((s) => `• ${s}`).join('\n');
  const escalateLine = escalate
    ? `\n\nI've also flagged this for a clinician review (${protocol.escalationThreshold} threshold).`
    : '';

  return {
    message: {
      id: `msg-${Date.now()}`,
      threadId: 'thread-meera',
      role: 'coach',
      text: `Thanks for telling me. Here's guidance from your care team's protocol on ${protocol.label.toLowerCase()}:\n\n${guidance}${escalateLine}`,
      sourceProtocolId: protocol.id,
      timestamp: now,
    },
    escalate,
    reason: escalate ? `Protocol ${protocol.label} crossed threshold` : undefined,
  };
}

export async function coachRespond(
  patient: Patient,
  text: string,
  severity?: 'mild' | 'moderate' | 'severe',
): Promise<CoachResult> {
  if (env.aiMode === 'fixture') {
    return fixtureCoach(patient, text, severity);
  }

  const protocol = matchProtocol(text);
  if (!protocol || protocol.id === 'proto-emergency') {
    return fixtureCoach(patient, text, severity);
  }

  const escalate = shouldEscalate(protocol, severity);
  try {
    const personalized = (await createJsonCompletion(
      `You are ${patient.coachName}, a warm adherence coach. You may ONLY rephrase the approved protocol guidance — never invent medical advice. Return JSON: { "text": string }.`,
      `Approved guidance:\n${protocol.patientFacingGuidance.join('\n')}\n\nPatient said: ${text}`,
    )) as { text: string };

    return {
      message: {
        id: `msg-${Date.now()}`,
        threadId: 'thread-meera',
        role: 'coach',
        text: personalized.text,
        sourceProtocolId: protocol.id,
        timestamp: new Date().toISOString(),
      },
      escalate,
      reason: escalate ? `Protocol ${protocol.label} crossed threshold` : undefined,
    };
  } catch (err) {
    console.error('[ai] coachRespond fell back to fixture:', err);
    return fixtureCoach(patient, text, severity);
  }
}

// ---------------------------------------------------------------------------
// Consult-to-home handoff AI layer (the design flow).
// extractPlan: transcript → structured HandoffPlan (fixture or live).
// respondToCheckIn: match the report to a clinician-authored protocol and
// decide escalation in code — the AI never writes medical advice.
// ---------------------------------------------------------------------------

const EXTRACT_SYSTEM_PROMPT = `You are a clinical scribe assistant. You capture and STRUCTURE what a clinician said in a remote chronic-condition review. You NEVER diagnose, never invent doses, and never add anything the clinician did not say.
Return a JSON object matching the HandoffPlan TypeScript type: patientName, condition, summary, medications[{id,name,dose,schedule,why,status}], titrationSteps[{id,label,dose,note?}], lifestyleActions[{id,title,detail,category}], redFlags[{id,symptom,action}], appointments[{id,title,when}].
For each medication "why", use the clinician's own reasoning in plain language. Use stable kebab-case ids.`;

// Models drift on enums — normalize whatever came back into the strict set
// so the UI's status badges never receive a free-text value.
function normalizeMedStatus(status: string): 'continued' | 'adjusted' | 'new' {
  const s = (status || '').toLowerCase();
  if (/(new|add|start)/.test(s)) return 'new';
  if (/(adjust|increas|decreas|chang|reduc|titrat)/.test(s)) return 'adjusted';
  return 'continued';
}

// Same treatment for lifestyle categories — an out-of-enum value must map to
// something renderable, never crash a lookup.
function normalizeCategory(
  category: string,
): 'monitoring' | 'movement' | 'diet' | 'other' {
  const c = (category || '').toLowerCase();
  if (/(monitor|check|track|measure|bp|blood|glucose|weigh)/.test(c)) return 'monitoring';
  if (/(move|walk|exercis|activ|step|fitness)/.test(c)) return 'movement';
  if (/(diet|food|eat|drink|nutrition|salt|sugar)/.test(c)) return 'diet';
  return 'other';
}

export async function extractPlan(transcript: string): Promise<HandoffPlan> {
  if (env.aiMode === 'fixture') {
    return HANDOFF_PLAN_FIXTURE;
  }
  try {
    const result = (await createJsonCompletion(
      EXTRACT_SYSTEM_PROMPT,
      `Consult transcript:\n\n${transcript}`,
    )) as HandoffPlan;
    return {
      ...HANDOFF_PLAN_FIXTURE,
      ...result,
      medications: (result.medications ?? []).map((m) => ({
        ...m,
        status: normalizeMedStatus(m.status),
      })),
      // Every array the UI maps over must BE an array, and every enum must be
      // in-set — a white screen is one undefined lookup away.
      titrationSteps: result.titrationSteps ?? [],
      lifestyleActions: (result.lifestyleActions ?? []).map((a) => ({
        ...a,
        category: normalizeCategory(a.category),
      })),
      redFlags: result.redFlags ?? [],
      appointments: result.appointments ?? [],
      // Authored server-side, never model-written: safety protocols + targets.
      protocols: HANDOFF_PLAN_FIXTURE.protocols,
      glucoseTarget: HANDOFF_PLAN_FIXTURE.glucoseTarget,
    };
  } catch (err) {
    console.error('[ai] extractPlan fell back to fixture:', err);
    return HANDOFF_PLAN_FIXTURE;
  }
}

export function respondToCheckIn(
  checkIn: CheckIn,
  plan: HandoffPlan | null,
): CheckInResponse {
  // Safety model: match the symptom to a clinician-authored protocol card and
  // hand over ITS steps. Escalation is decided here in code, never by a model.
  const symptom = checkIn.symptom.toLowerCase();
  const card = plan?.protocols?.find((p) => symptom.includes(p.trigger));
  if (card) {
    const escalate =
      checkIn.severity === 'severe' || checkIn.severity === 'moderate';
    if (card.id === 'proto-nausea' && escalate) {
      return CHECK_IN_RESPONSE_FIXTURE;
    }
    return {
      message: `Thanks for logging this. Here's the guidance your clinician attached for ${card.label.toLowerCase()}.`,
      protocolSteps: card.steps,
      escalate,
      escalationNote: escalate
        ? "We've flagged this to your care team so they can check in with you."
        : undefined,
    };
  }
  return genericCheckInResponse(checkIn);
}

const EXPLAIN_SYSTEM_PROMPT = `You rewrite something a clinician already told a patient at 4 progressively simpler reading levels. You NEVER add medical advice, numbers, or claims beyond the source material — you only rephrase what was said, more simply each level.
Return JSON: { "title": string, "levels": [{ "tag": string, "text": string }] } with exactly 4 levels and these tags in order: "As your clinician said", "In plain terms", "Simpler", "Simplest". Keep each level to 1–2 warm, plain sentences. The last level should use an everyday analogy.`;

export async function explainConcept(
  plan: HandoffPlan | null,
  concept?: string,
): Promise<Explainer> {
  if (env.aiMode === 'fixture' || !plan) {
    return EXPLAINER_FIXTURE;
  }
  try {
    const source = [
      `Concept to explain: ${concept || 'the HbA1c result and why the plan changed'}`,
      `Plan summary: ${plan.summary}`,
      ...plan.medications.map((m) => `${m.name}: "${m.why}"`),
    ].join('\n');
    const result = (await createJsonCompletion(EXPLAIN_SYSTEM_PROMPT, source)) as Explainer;
    if (!result?.title || result.levels?.length !== 4) {
      throw new Error('explainer failed schema check');
    }
    return result;
  } catch (err) {
    console.error('[ai] explainConcept fell back to fixture:', err);
    return EXPLAINER_FIXTURE;
  }
}

export async function reviewLogs(logs: LogEntry[]): Promise<string> {
  const unreviewed = logs.filter((l) => !l.reviewed);
  if (unreviewed.length === 0) {
    return 'Nothing new to review — your streak is looking solid.';
  }

  if (env.aiMode === 'fixture') {
    const types = [...new Set(unreviewed.map((l) => l.type))].join(', ');
    return `I reviewed your latest logs (${types}). Protein and steps are the levers this week — keep the evening walk, and if nausea shows up, smaller meals + steady sips. You're not doing this unread.`;
  }

  try {
    const result = (await createJsonCompletion(
      'Summarize patient logs into a short closed-loop coaching note. No diagnosis. JSON: { "feedback": string }',
      JSON.stringify(unreviewed),
    )) as { feedback: string };
    return result.feedback;
  } catch {
    return 'I reviewed your week. Keep logging — every entry gets a response.';
  }
}

export { PROTOCOLS };
