/**
 * Consult-to-Home handoff domain — types, fixtures, and deterministic glucose
 * logic shared by the API (server actions) and the web app (clinic stream +
 * progress trend). Ported from the design-complete /demo prototype; /demo
 * itself is the read-only design reference.
 *
 * The AI never diagnoses — every shape here captures and structures what the
 * clinician said, and check-in responses only ever serve clinician-approved
 * protocols.
 */

export interface Medication {
  id: string;
  name: string;
  dose: string;
  schedule: string; // when / how often, in plain language
  why: string; // the clinician's own words for why this is prescribed
  status: 'continued' | 'adjusted' | 'new';
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
  category: 'monitoring' | 'movement' | 'diet' | 'other';
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
export interface ApprovedProtocol {
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

export interface HandoffPlan {
  patientName: string;
  condition: string;
  summary: string; // one-line, plain-language recap of the review
  medications: Medication[];
  titrationSteps: TitrationStep[];
  lifestyleActions: LifestyleAction[];
  redFlags: RedFlag[];
  appointments: Appointment[];
  protocols: ApprovedProtocol[]; // clinician-authored check-in responses
  glucoseTarget: GlucoseTarget; // clinician-set monitoring thresholds
}

// A partial patch applied to the assembling plan during the live stream.
export type PlanPatch = Partial<HandoffPlan>;

// Timed extraction event: at this word index in the stream, merge this patch
// into the sidebar plan so it "assembles itself" as the clinician speaks.
export interface ExtractionEvent {
  atWordIndex: number;
  label: string; // short caption shown when the event fires
  planPatch: PlanPatch;
}

export type CheckInSeverity = 'mild' | 'moderate' | 'severe';

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
  context: 'fasting' | 'post-meal';
  loggedAt: string; // ISO timestamp
  flagged: boolean; // crossed the clinician-set threshold
}

// Plain-language read-out of the glucose trend — the "complex data into simple
// advice" job, computed deterministically so the demo never breaks.
export interface GlucoseTrend {
  direction: 'down' | 'up' | 'steady';
  readOut: string;
  latest: number | null;
  inRangePct: number; // % of readings within target
}

// One entry in the clinician's between-visit inbox. The source is either a
// symptom check-in or a flagged glucose reading. Carries the patient identity
// so a multi-patient inbox reads correctly.
export interface InboxItem {
  id: string;
  patientId: string;
  patientName: string;
  kind: 'check-in' | 'glucose';
  checkIn?: CheckIn;
  reading?: GlucoseReading;
  response: CheckInResponse;
  read: boolean;
}

// A patient record, created BY THE CLINICIAN. The record id is a short code
// (like a booking reference) the clinician hands to the patient; the patient
// enters it to access their record. Production path: NHS login — identity
// always originates on the care-provider side, never self-asserted.
// One clinician-side audit event — who did what, to which record, when.
export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  actor: 'clinician' | 'patient' | 'system';
  event: string; // e.g. "record.created", "plan.sent", "checkin.flagged"
  patientId?: string;
  patientName?: string;
  detail?: string;
  // Structured diff lines for plan updates: "+ added", "− removed", "~ changed: a → b".
  changes?: string[];
}

export interface PatientRecord {
  id: string; // short clinician-issued code, e.g. "CAD-7K2F"
  name: string;
  details?: string; // condition / context the clinician entered
  createdAt: string;
  transcript?: string; // source consult transcript the plan was extracted from
  profile: PatientProfile | null; // set when the patient onboards (consent)
  planSent: boolean;
  planSentAt?: string; // first-send timestamp — anchors titration progress
  draftPlan: HandoffPlan | null; // AI draft under clinician review — never patient-visible
  plan: HandoffPlan | null;
  latestResponse: CheckInResponse | null;
  glucoseReadings: GlucoseReading[];
  inbox: PatientMessage[]; // the patient's own messages from the care team
  explainer: Explainer | null;
  // Daily rhythm — server-tracked so nothing resets on refresh.
  streakDays: number;
  taskDate: string; // YYYY-MM-DD the tasksDone list belongs to
  tasksDone: string[]; // task ids completed on taskDate
}

// Patient-side onboarding profile. Consent is the load-bearing field — the
// data flow to the care team only exists because the patient granted it.
export interface PatientProfile {
  name: string;
  consentGiven: boolean;
  remindersEnabled: boolean;
  injectionDay?: string; // preferred weekly injection day
  onboardedAt: string; // ISO timestamp
}

// Progressive "explain it simpler" content. In live mode the levels are
// AI-generated from what the clinician actually said in the plan; in fixture
// mode they're scripted. Never new medical advice — always a rephrasing.
export interface Explainer {
  title: string;
  levels: { tag: string; text: string }[];
}

export const EXPLAINER_FIXTURE: Explainer = {
  title: 'Your HbA1c, explained',
  levels: [
    {
      tag: 'As your clinician said',
      text: 'Your HbA1c came back at 58 mmol/mol, so we want to bring that down.',
    },
    {
      tag: 'In plain terms',
      text: "HbA1c is your average blood sugar over the last ~3 months. 58 is a little above target, we're aiming for under 48.",
    },
    {
      tag: 'Simpler',
      text: 'Think of it as your blood-sugar “score” for the past few months. Yours is a bit high, so the plan gently brings it down.',
    },
    {
      tag: 'Simplest',
      text: "It's like a report card for your blood sugar. Yours needs a little work, and that's exactly what your plan is for.",
    },
  ],
};

// One entry in the PATIENT's inbox — everything the care team's system has
// sent them: the plan arriving, and each response to a check-in or reading.
export interface PatientMessage {
  id: string;
  kind: 'plan' | 'check-in' | 'glucose';
  title: string;
  body: string;
  steps?: string[]; // clinician-approved steps attached to the message
  escalated?: boolean; // true => the care team was looped in
  at: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Scripted consult transcript.
// UK remote chronic-condition REVIEW (not a diagnosis). Clinician + Meera, 52,
// type 2 diabetes. Metformin dose adjusted, semaglutide newly prescribed with a
// titration build-up, home BP monitoring twice weekly, walking + one dietary
// change, red flags, follow-up in 6 weeks. Replayed word-by-word to look live.
// ---------------------------------------------------------------------------
export const CONSULT_TRANSCRIPT = `Dr Okafor: Hi Meera, good to see you again. This is just your routine diabetes review, so let's go through how things have been and adjust your plan together.
Meera: Thanks doctor. Honestly my sugars have been creeping up in the mornings.
Dr Okafor: I can see that in your readings. Your last HbA1c came back at fifty-eight, so we do want to bring that down. Let's start with your metformin. You're on five hundred milligrams twice a day at the moment.
Meera: Yes, morning and evening with food.
Dr Okafor: I'd like to increase that to one thousand milligrams twice a day. Same routine, with breakfast and with your evening meal. Taking it with food really matters because it protects your stomach.
Meera: Okay, one thousand twice a day.
Dr Okafor: Now, because your HbA1c is still above target, I'm also going to start you on a medicine called semaglutide. It's a weekly injection that helps your body manage blood sugar and often helps with weight too.
Meera: A weekly injection, alright.
Dr Okafor: We build the dose up slowly to keep side effects gentle. For the first four weeks you'll be on zero point two five milligrams once a week. Then weeks five to eight we move to zero point five milligrams. If you're tolerating it well, from week nine we go to one milligram, and that's usually your maintenance dose.
Meera: So it steps up every four weeks.
Dr Okafor: Exactly. Injected the same day each week. Now I also want you monitoring your blood pressure at home, twice a week, morning is best, and just note the numbers in your app.
Meera: Twice a week, I can do that.
Dr Okafor: On the lifestyle side, the single most useful thing is a short walk after your evening meal, aim for twenty minutes. And if we change one thing in your diet, let's cut the sugary drinks and swap to water or no-sugar options.
Meera: The evening walk I can manage. I'll work on the drinks.
Dr Okafor: Two things to watch for. The semaglutide can cause some nausea early on, that's normal, but if you get severe vomiting or you can't keep fluids down, contact us. And watch for hypo symptoms, feeling shaky, sweaty, or confused, have something sugary and let us know if it keeps happening.
Meera: Severe sickness or feeling shaky. Understood.
Dr Okafor: Perfect. Let's review again in six weeks to see how the semaglutide is settling and recheck your numbers. You're doing the right things, Meera.
Meera: Thank you doctor, that's really clear.`;

// ---------------------------------------------------------------------------
// The HandoffPlan the AI extracts from the transcript above (fixture output).
// ---------------------------------------------------------------------------
export const HANDOFF_PLAN_FIXTURE: HandoffPlan = {
  patientName: 'Meera',
  condition: 'Type 2 diabetes, routine review',
  summary:
    'Metformin increased and a new weekly semaglutide injection started, with home BP checks and two lifestyle changes. Review in 6 weeks.',
  medications: [
    {
      id: 'med-metformin',
      name: 'Metformin',
      dose: '1000 mg, twice a day',
      schedule: 'With breakfast and with your evening meal',
      why: 'Your HbA1c came back at 58, so we want to bring that down. Taking it with food protects your stomach.',
      status: 'adjusted',
    },
    {
      id: 'med-semaglutide',
      name: 'Semaglutide',
      dose: 'Weekly injection (dose builds up, see timeline)',
      schedule: 'Once a week, the same day each week',
      why: 'Because your HbA1c is still above target. It helps your body manage blood sugar and often helps with weight too.',
      status: 'new',
    },
  ],
  titrationSteps: [
    {
      id: 'tit-1',
      label: 'Weeks 1–4',
      dose: '0.25 mg once a week',
      note: 'Starting dose, kept low to keep side effects gentle.',
    },
    {
      id: 'tit-2',
      label: 'Weeks 5–8',
      dose: '0.5 mg once a week',
    },
    {
      id: 'tit-3',
      label: 'Week 9 onwards',
      dose: '1 mg once a week',
      note: "Usual maintenance dose, if you're tolerating it well.",
    },
  ],
  lifestyleActions: [
    {
      id: 'life-bp',
      title: 'Home blood pressure checks',
      detail: 'Twice a week, mornings are best. Note the numbers in your app.',
      category: 'monitoring',
    },
    {
      id: 'life-walk',
      title: 'Evening walk',
      detail: 'A short walk after your evening meal. Aim for 20 minutes.',
      category: 'movement',
    },
    {
      id: 'life-drinks',
      title: 'Swap sugary drinks',
      detail: 'Cut the sugary drinks and swap to water or no-sugar options.',
      category: 'diet',
    },
  ],
  redFlags: [
    {
      id: 'flag-nausea',
      symptom: "Severe vomiting or can't keep fluids down",
      action:
        "Some early nausea is normal, but if it's severe or you can't keep fluids down, contact the care team.",
    },
    {
      id: 'flag-hypo',
      symptom: 'Hypo symptoms: shaky, sweaty, or confused',
      action:
        'Have something sugary right away, and let us know if it keeps happening.',
    },
  ],
  appointments: [
    {
      id: 'appt-review',
      title: 'Follow-up review',
      when: 'In 6 weeks, to see how the semaglutide is settling and recheck your numbers.',
    },
  ],
  // Clinician-authored responses attached at send time. The app matches a
  // patient's check-in to one of these; it never writes advice itself.
  protocols: [
    {
      id: 'proto-nausea',
      trigger: 'nausea',
      label: 'Nausea (early weeks)',
      steps: [
        'Eat smaller meals and stop as soon as you feel full.',
        'Sip water regularly through the day to stay hydrated.',
        'Take your time around meals and avoid rich, greasy, or very sweet foods.',
        'Keep taking your medicine as scheduled unless told otherwise.',
      ],
      escalateWhen: "Moderate or worse, or can't keep fluids down.",
    },
    {
      id: 'proto-hypo',
      trigger: 'hypo',
      label: 'Hypo (low blood sugar)',
      steps: [
        'Have something sugary right away, like juice or glucose tablets.',
        'Recheck after 15 minutes and repeat if you still feel low.',
        'Follow up with a snack containing carbs once you feel better.',
      ],
      escalateWhen: 'Repeated episodes, or any confusion.',
    },
  ],
  // Fasting glucose target the clinician set for home monitoring (mmol/L).
  glucoseTarget: { low: 4, high: 7 },
};

// A retention signal shown on the patient's home. Fixture value for the demo.
export const STREAK_DAYS = 6;

// Fallback task count when a record has no plan yet.
export const DAILY_TASK_COUNT = 6;

// A daily-checklist item DERIVED FROM THE PLAN — the patient's Today list and
// the clinician's completion math both come from this one builder, so the
// checklist always matches what the clinician actually prescribed.
export interface DailyTask {
  id: string; // stable: derived from the plan item's id
  title: string;
  detail: string;
  when: string;
  kind: 'medication' | 'monitoring' | 'movement' | 'diet' | 'other';
  weekly?: boolean;
  glp1?: boolean;
}

export function buildDailyTasks(plan: HandoffPlan | null): DailyTask[] {
  if (!plan) return [];
  const tasks: DailyTask[] = [];
  for (const m of plan.medications) {
    const glp1 = /semaglutide|ozempic|wegovy|tirzepatide|glp/i.test(m.name);
    tasks.push({
      id: `task-${m.id}`,
      title: glp1 ? `${m.name} injection` : `${m.name} ${m.dose}`.trim(),
      detail: m.schedule,
      when: glp1 ? 'Weekly' : 'Daily',
      kind: 'medication',
      weekly: glp1,
      glp1,
    });
  }
  for (const a of plan.lifestyleActions) {
    tasks.push({
      id: `task-${a.id}`,
      title: a.title,
      detail: a.detail,
      when: a.category === 'movement' ? 'Evening' : 'Today',
      kind: a.category,
    });
  }
  return tasks;
}

// Which titration step the patient is on, from weeks elapsed since the plan
// was sent. Reads the starting week out of each label ("Weeks 5–8" → 5,
// "From week 9" → 9); falls back to 4-week blocks when a label has no number.
export function currentTitrationStepIndex(
  steps: TitrationStep[],
  planSentAt?: string,
): number {
  if (!steps.length || !planSentAt) return 0;
  const week =
    Math.floor((Date.now() - new Date(planSentAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  let idx = 0;
  steps.forEach((s, i) => {
    const m = s.label.match(/(\d+)/);
    const startWeek = m ? Number(m[1]) : i * 4 + 1;
    if (week >= startWeek) idx = i;
  });
  return idx;
}

// Seeded fasting-glucose history so the trend has context when the plan lands.
// Morning readings trending down over the past week toward the target ceiling.
export function seedGlucoseHistory(): GlucoseReading[] {
  const values = [11.8, 9.2, 7.6, 6.9, 6.6, 6.4];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return values.map((value, i) => ({
    id: `glu-seed-${i}`,
    value,
    context: 'fasting' as const,
    // Oldest reading first; space them one day apart ending ~yesterday.
    loggedAt: new Date(now - (values.length - i) * dayMs).toISOString(),
    flagged: false, // historical context, not a live alert
  }));
}

// ---------------------------------------------------------------------------
// Timed extraction events. As the transcript streams, when the streamed word
// count crosses `atWordIndex`, the patch merges into the sidebar plan so it
// visibly assembles itself. Indices are approximate positions in the script.
// ---------------------------------------------------------------------------
export const EXTRACTION_EVENTS: ExtractionEvent[] = [
  {
    atWordIndex: 8,
    label: 'Consult identified: routine diabetes review',
    planPatch: {
      patientName: HANDOFF_PLAN_FIXTURE.patientName,
      condition: HANDOFF_PLAN_FIXTURE.condition,
    },
  },
  {
    atWordIndex: 80,
    label: 'Medication adjusted: Metformin',
    planPatch: { medications: [HANDOFF_PLAN_FIXTURE.medications[0]] },
  },
  {
    atWordIndex: 120,
    label: 'New medication: Semaglutide',
    planPatch: {
      medications: [
        HANDOFF_PLAN_FIXTURE.medications[0],
        HANDOFF_PLAN_FIXTURE.medications[1],
      ],
    },
  },
  {
    atWordIndex: 175,
    label: 'Titration schedule captured (dose build-up)',
    planPatch: { titrationSteps: HANDOFF_PLAN_FIXTURE.titrationSteps },
  },
  {
    atWordIndex: 205,
    label: 'Monitoring: home BP twice weekly',
    planPatch: {
      lifestyleActions: [HANDOFF_PLAN_FIXTURE.lifestyleActions[0]],
      glucoseTarget: HANDOFF_PLAN_FIXTURE.glucoseTarget,
    },
  },
  {
    atWordIndex: 240,
    label: 'Lifestyle actions: walk + swap drinks',
    planPatch: { lifestyleActions: HANDOFF_PLAN_FIXTURE.lifestyleActions },
  },
  {
    atWordIndex: 300,
    label: 'Safety protocols attached (nausea, hypo)',
    planPatch: {
      redFlags: HANDOFF_PLAN_FIXTURE.redFlags,
      protocols: HANDOFF_PLAN_FIXTURE.protocols,
    },
  },
  {
    atWordIndex: 330,
    label: 'Follow-up booked: 6 weeks',
    planPatch: {
      appointments: HANDOFF_PLAN_FIXTURE.appointments,
      summary: HANDOFF_PLAN_FIXTURE.summary,
    },
  },
];

// Response for moderate nausea. Escalates so the care team is looped in at the
// exact moment GLP-1 patients tend to quit silently.
export const CHECK_IN_RESPONSE_FIXTURE: CheckInResponse = {
  message:
    'Some nausea in the first few weeks of semaglutide is common and usually settles. Here is what your care team suggests.',
  protocolSteps: [
    'Eat smaller meals and stop as soon as you feel full.',
    'Sip water regularly through the day to stay hydrated.',
    'Take your time around meals and avoid rich, greasy, or very sweet foods.',
    'Keep taking your medicine as scheduled unless told otherwise.',
  ],
  escalate: true,
  escalationNote:
    "We've flagged this to your care team so they can check in with you. If you get severe vomiting or can't keep fluids down, contact them straight away.",
};

// Fallback when a check-in matches no clinician-authored protocol.
export function genericCheckInResponse(checkIn: CheckIn): CheckInResponse {
  const escalate = checkIn.severity === 'severe';
  return {
    message:
      'Thanks for logging this. Here are the self-care steps your care team has approved.',
    protocolSteps: [
      'Note when the symptom started and how long it lasts.',
      'Keep hydrated and rest where you can.',
      'Keep taking your medicine as scheduled unless told otherwise.',
    ],
    escalate,
    escalationNote: escalate
      ? "Because you marked this as severe, we've flagged it to your care team right away."
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Deterministic glucose analysis — the "turn complex data into simple advice"
// job. Kept pure (no LLM) so the demo is reliable and offline-safe.
// ---------------------------------------------------------------------------

export function isFlagged(value: number, target: GlucoseTarget): boolean {
  return value > target.high || value < target.low;
}

// Plain-language trend from the reading history (oldest first).
export function computeTrend(
  readings: GlucoseReading[],
  target: GlucoseTarget,
): GlucoseTrend {
  if (readings.length === 0) {
    return {
      direction: 'steady',
      readOut: 'No readings yet.',
      latest: null,
      inRangePct: 0,
    };
  }
  const values = readings.map((r) => r.value);
  const latest = values[values.length - 1];
  const inRange = values.filter((v) => v >= target.low && v <= target.high).length;
  const inRangePct = Math.round((inRange / values.length) * 100);

  // Compare the average of the earlier half against the later half.
  const mid = Math.floor(values.length / 2) || 1;
  const earlier = avg(values.slice(0, mid));
  const later = avg(values.slice(-mid));
  const delta = later - earlier;

  let direction: GlucoseTrend['direction'] = 'steady';
  if (delta <= -0.4) direction = 'down';
  else if (delta >= 0.4) direction = 'up';

  const nearTarget = latest <= target.high + 0.3;
  let readOut: string;
  if (direction === 'down' && nearTarget) {
    readOut = `Your morning readings are trending down and closing in on your ${target.low}–${target.high} target. Nice work, keep going.`;
  } else if (direction === 'down') {
    readOut = `Your morning readings are trending down. You're heading in the right direction toward your ${target.low}–${target.high} target.`;
  } else if (direction === 'up') {
    readOut = `Your morning readings have crept up recently. Keep logging, and your care team will see the pattern.`;
  } else {
    readOut = `Your morning readings are holding steady around your ${target.low}–${target.high} target.`;
  }
  return { direction, readOut, latest, inRangePct };
}

// The response shown to the patient when they log a reading, plus whether it
// should reach the care team.
export function respondToGlucose(
  reading: GlucoseReading,
  target: GlucoseTarget,
): CheckInResponse {
  const high = reading.value > target.high;
  const low = reading.value < target.low;

  if (low) {
    return {
      message: `A ${reading.value} mmol/L reading is below your target. Let's treat that now.`,
      protocolSteps: [
        'Have something sugary right away, like juice or glucose tablets.',
        "Recheck in 15 minutes and repeat if you're still low.",
        'Have a snack with carbs once you feel better.',
      ],
      escalate: true,
      escalationNote:
        "We've let your care team know about this low reading so they can check in.",
    };
  }
  if (high) {
    return {
      message: `A ${reading.value} mmol/L reading is above your ${target.low}–${target.high} target. One high reading isn't an emergency, but let's keep an eye on it.`,
      protocolSteps: [
        'Drink some water and stay active if you can.',
        'Check whether anything unusual affected this reading (a big meal, stress, illness).',
        'Keep logging so your care team can see the pattern.',
      ],
      escalate: true,
      escalationNote:
        "We've flagged this reading to your care team so they can review your numbers.",
    };
  }
  return {
    message: `A ${reading.value} mmol/L reading is right in your ${target.low}–${target.high} target. Logged.`,
    protocolSteps: [
      "Keep up your routine, it's working.",
      'Log your next reading at your usual time.',
    ],
    escalate: false,
  };
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
