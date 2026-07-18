import type { CarePlan, CheckIn, CheckInResponse } from "./types";
import {
  CARE_PLAN_FIXTURE,
  CHECK_IN_RESPONSE_FIXTURE,
  genericCheckInResponse,
} from "./fixtures";

// The AI layer. Two functions the app depends on. If OPENAI_API_KEY is set we
// call OpenAI with structured JSON output; otherwise we return fixtures so the
// whole demo works fully offline. The AI never diagnoses — it captures and
// structures what the clinician said, and only ever serves clinician-approved
// protocols.

const MODEL = "gpt-4o";

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callOpenAI(
  systemPrompt: string,
  userContent: string,
): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

const EXTRACT_SYSTEM_PROMPT = `You are a clinical scribe assistant. You capture and STRUCTURE what a clinician said in a remote chronic-condition review. You NEVER diagnose, never invent doses, and never add anything the clinician did not say.

Return a JSON object matching this TypeScript type exactly:
{
  patientName: string;
  condition: string;
  summary: string;
  medications: { id: string; name: string; dose: string; schedule: string; why: string; status: "continued" | "adjusted" | "new" }[];
  titrationSteps: { id: string; label: string; dose: string; note?: string }[];
  lifestyleActions: { id: string; title: string; detail: string; category: "monitoring" | "movement" | "diet" | "other" }[];
  redFlags: { id: string; symptom: string; action: string }[];
  appointments: { id: string; title: string; when: string }[];
}
For each medication "why", use the clinician's own reasoning in plain language. Use stable kebab-case ids.`;

export async function extractPlan(transcript: string): Promise<CarePlan> {
  if (!hasOpenAI()) {
    return CARE_PLAN_FIXTURE;
  }
  try {
    const result = (await callOpenAI(
      EXTRACT_SYSTEM_PROMPT,
      `Consult transcript:\n\n${transcript}`,
    )) as CarePlan;
    return result;
  } catch (err) {
    console.error("extractPlan fell back to fixture:", err);
    return CARE_PLAN_FIXTURE;
  }
}

const CHECKIN_SYSTEM_PROMPT = `You are a chronic-care companion responding to a patient's between-visit check-in. You NEVER diagnose. You only return clinician-approved self-care guidance, and you escalate to the care team when a symptom is severe or a safety threshold is crossed.

Return a JSON object matching this TypeScript type exactly:
{
  message: string;
  protocolSteps: string[];
  escalate: boolean;
  escalationNote?: string;
}
Keep it warm, plain, and short. Set escalate=true for severe symptoms or when the patient cannot keep fluids down.`;

export async function respondToCheckIn(
  checkIn: CheckIn,
  plan: CarePlan | null,
): Promise<CheckInResponse> {
  if (!hasOpenAI()) {
    // Safety model: match the symptom to a clinician-authored protocol card and
    // hand over ITS steps. The app never writes advice — the doctor packed the
    // kit; we hand over the right pouch and decide whether to escalate.
    const symptom = checkIn.symptom.toLowerCase();
    const card = plan?.protocols?.find((p) => symptom.includes(p.trigger));
    if (card) {
      const escalate =
        checkIn.severity === "severe" || checkIn.severity === "moderate";
      return {
        message: `Thanks for logging this. Here's the guidance your clinician attached for ${card.label.toLowerCase()}.`,
        protocolSteps: card.steps,
        escalate,
        escalationNote: escalate
          ? `We've flagged this to your care team so they can check in. Contact them straight away if it gets worse (${card.escalateWhen.toLowerCase()})`
          : undefined,
      };
    }
    // No matching card: fall back to the crafted nausea fixture or generic.
    if (symptom.includes("nausea")) {
      return {
        ...CHECK_IN_RESPONSE_FIXTURE,
        escalate:
          checkIn.severity === "moderate" || checkIn.severity === "severe",
      };
    }
    return genericCheckInResponse(checkIn);
  }
  try {
    const planContext = plan
      ? `The patient's current care plan is:\n${JSON.stringify(plan, null, 2)}`
      : "No care plan is available.";
    const result = (await callOpenAI(
      CHECKIN_SYSTEM_PROMPT,
      `${planContext}\n\nPatient check-in:\n${JSON.stringify(checkIn, null, 2)}`,
    )) as CheckInResponse;
    return result;
  } catch (err) {
    console.error("respondToCheckIn fell back to fixture:", err);
    if (checkIn.symptom.toLowerCase().includes("nausea")) {
      return CHECK_IN_RESPONSE_FIXTURE;
    }
    return genericCheckInResponse(checkIn);
  }
}
