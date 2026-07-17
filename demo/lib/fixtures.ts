import type {
  CarePlan,
  CheckIn,
  CheckInResponse,
  ExtractionEvent,
  GlucoseReading,
} from "./types";

// ---------------------------------------------------------------------------
// Scripted consult transcript.
// UK remote chronic-condition REVIEW (not a diagnosis). Clinician + Meera, 52,
// type 2 diabetes. Metformin dose adjusted, semaglutide newly prescribed with a
// 4-step titration, home BP monitoring twice weekly, walking + one dietary
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
// The CarePlan the AI extracts from the transcript above (fixture mode output).
// ---------------------------------------------------------------------------
export const CARE_PLAN_FIXTURE: CarePlan = {
  patientName: "Meera",
  condition: "Type 2 diabetes, routine review",
  summary:
    "Metformin increased and a new weekly semaglutide injection started, with home BP checks and two lifestyle changes. Review in 6 weeks.",
  medications: [
    {
      id: "med-metformin",
      name: "Metformin",
      dose: "1000 mg, twice a day",
      schedule: "With breakfast and with your evening meal",
      why: "Your HbA1c came back at 58, so we want to bring that down. Taking it with food protects your stomach.",
      status: "adjusted",
    },
    {
      id: "med-semaglutide",
      name: "Semaglutide",
      dose: "Weekly injection (dose builds up, see timeline)",
      schedule: "Once a week, the same day each week",
      why: "Because your HbA1c is still above target. It helps your body manage blood sugar and often helps with weight too.",
      status: "new",
    },
  ],
  titrationSteps: [
    {
      id: "tit-1",
      label: "Weeks 1–4",
      dose: "0.25 mg once a week",
      note: "Starting dose, kept low to keep side effects gentle.",
    },
    {
      id: "tit-2",
      label: "Weeks 5–8",
      dose: "0.5 mg once a week",
    },
    {
      id: "tit-3",
      label: "Week 9 onwards",
      dose: "1 mg once a week",
      note: "Usual maintenance dose, if you're tolerating it well.",
    },
  ],
  lifestyleActions: [
    {
      id: "life-bp",
      title: "Home blood pressure checks",
      detail: "Twice a week, mornings are best. Note the numbers in your app.",
      category: "monitoring",
    },
    {
      id: "life-walk",
      title: "Evening walk",
      detail: "A short walk after your evening meal. Aim for 20 minutes.",
      category: "movement",
    },
    {
      id: "life-drinks",
      title: "Swap sugary drinks",
      detail: "Cut the sugary drinks and swap to water or no-sugar options.",
      category: "diet",
    },
  ],
  redFlags: [
    {
      id: "flag-nausea",
      symptom: "Severe vomiting or can't keep fluids down",
      action:
        "Some early nausea is normal, but if it's severe or you can't keep fluids down, contact the care team.",
    },
    {
      id: "flag-hypo",
      symptom: "Hypo symptoms: shaky, sweaty, or confused",
      action:
        "Have something sugary right away, and let us know if it keeps happening.",
    },
  ],
  appointments: [
    {
      id: "appt-review",
      title: "Follow-up review",
      when: "In 6 weeks, to see how the semaglutide is settling and recheck your numbers.",
    },
  ],
  // Clinician-authored responses attached at send time. The app matches a
  // patient's check-in to one of these; it never writes advice itself.
  protocols: [
    {
      id: "proto-nausea",
      trigger: "nausea",
      label: "Nausea (early weeks)",
      steps: [
        "Eat smaller meals and stop as soon as you feel full.",
        "Sip water regularly through the day to stay hydrated.",
        "Take your time around meals and avoid rich, greasy, or very sweet foods.",
        "Keep taking your medicine as scheduled unless told otherwise.",
      ],
      escalateWhen: "Moderate or worse, or can't keep fluids down.",
    },
    {
      id: "proto-hypo",
      trigger: "hypo",
      label: "Hypo (low blood sugar)",
      steps: [
        "Have something sugary right away, like juice or glucose tablets.",
        "Recheck after 15 minutes and repeat if you still feel low.",
        "Follow up with a snack containing carbs once you feel better.",
      ],
      escalateWhen: "Repeated episodes, or any confusion.",
    },
  ],
  // Fasting glucose target the clinician set for home monitoring (mmol/L).
  glucoseTarget: { low: 4, high: 7 },
};

// A retention signal shown on the patient's home. Fixture value for the demo.
export const STREAK_DAYS = 6;

// Seeded fasting-glucose history so the trend has context when the plan lands.
// Morning readings trending down over the past week toward the target ceiling.
export function seedGlucoseHistory(): GlucoseReading[] {
  const values = [11.8, 9.2, 7.6, 6.9, 6.6, 6.4];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return values.map((value, i) => ({
    id: `glu-seed-${i}`,
    value,
    context: "fasting" as const,
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
    label: "Consult identified: routine diabetes review",
    planPatch: {
      patientName: CARE_PLAN_FIXTURE.patientName,
      condition: CARE_PLAN_FIXTURE.condition,
    },
  },
  {
    atWordIndex: 80,
    label: "Medication adjusted: Metformin",
    planPatch: { medications: [CARE_PLAN_FIXTURE.medications[0]] },
  },
  {
    atWordIndex: 120,
    label: "New medication: Semaglutide",
    planPatch: {
      medications: [
        CARE_PLAN_FIXTURE.medications[0],
        CARE_PLAN_FIXTURE.medications[1],
      ],
    },
  },
  {
    atWordIndex: 175,
    label: "Titration schedule captured (4-step build-up)",
    planPatch: { titrationSteps: CARE_PLAN_FIXTURE.titrationSteps },
  },
  {
    atWordIndex: 205,
    label: "Monitoring: home BP twice weekly",
    planPatch: {
      lifestyleActions: [CARE_PLAN_FIXTURE.lifestyleActions[0]],
      glucoseTarget: CARE_PLAN_FIXTURE.glucoseTarget,
    },
  },
  {
    atWordIndex: 240,
    label: "Lifestyle actions: walk + swap drinks",
    planPatch: { lifestyleActions: CARE_PLAN_FIXTURE.lifestyleActions },
  },
  {
    atWordIndex: 300,
    label: "Safety protocols attached (nausea, hypo)",
    planPatch: {
      redFlags: CARE_PLAN_FIXTURE.redFlags,
      protocols: CARE_PLAN_FIXTURE.protocols,
    },
  },
  {
    atWordIndex: 330,
    label: "Follow-up booked: 6 weeks",
    planPatch: {
      appointments: CARE_PLAN_FIXTURE.appointments,
      summary: CARE_PLAN_FIXTURE.summary,
    },
  },
];

// ---------------------------------------------------------------------------
// Check-in fixtures. The demo path is "nausea, moderate".
// ---------------------------------------------------------------------------
export const SAMPLE_CHECK_IN: CheckIn = {
  symptom: "Nausea",
  severity: "moderate",
  note: "Feeling queasy since starting the injection.",
  loggedAt: new Date().toISOString(),
};

// Response for moderate nausea. Escalates so the care team is looped in at the
// exact moment GLP-1 patients tend to quit silently.
export const CHECK_IN_RESPONSE_FIXTURE: CheckInResponse = {
  message:
    "Some nausea in the first few weeks of semaglutide is common and usually settles. Here is what your care team suggests.",
  protocolSteps: [
    "Eat smaller meals and stop as soon as you feel full.",
    "Sip water regularly through the day to stay hydrated.",
    "Take your time around meals and avoid rich, greasy, or very sweet foods.",
    "Keep taking your medicine as scheduled unless told otherwise.",
  ],
  escalate: true,
  escalationNote:
    "We've flagged this to your care team so they can check in with you. If you get severe vomiting or can't keep fluids down, contact them straight away.",
};

// Fallback used by lib/ai.ts when a check-in isn't the scripted nausea case.
export function genericCheckInResponse(checkIn: CheckIn): CheckInResponse {
  const escalate = checkIn.severity === "severe";
  return {
    message:
      "Thanks for logging this. Here are the self-care steps your care team has approved.",
    protocolSteps: [
      "Note when the symptom started and how long it lasts.",
      "Keep hydrated and rest where you can.",
      "Keep taking your medicine as scheduled unless told otherwise.",
    ],
    escalate,
    escalationNote: escalate
      ? "Because you marked this as severe, we've flagged it to your care team right away."
      : undefined,
  };
}
