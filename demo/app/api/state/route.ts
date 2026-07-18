import { NextResponse } from "next/server";
import {
  addGlucoseReading,
  addInboxItem,
  getState,
  markInboxRead,
  setState,
} from "@/lib/store";
import { extractPlan, respondToCheckIn } from "@/lib/ai";
import { CONSULT_TRANSCRIPT, seedGlucoseHistory } from "@/lib/fixtures";
import { computeTrend, isFlagged, respondToGlucose } from "@/lib/glucose";
import type { CarePlan, CheckIn, GlucoseReading, InboxItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/state — full shared state, polled by both surfaces (~1s).
export async function GET() {
  return NextResponse.json(getState());
}

// POST /api/state — action dispatcher for the demo flow.
// Actions:
//   { action: "sendPlan", plan?, transcript? } -> clinician approves & sends
//   { action: "checkIn", checkIn }              -> patient logs a side effect
//   { action: "logGlucose", reading }           -> patient logs a reading
//   { action: "markRead", id }                  -> clinician reads an inbox item
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  switch (action) {
    case "sendPlan": {
      // Clinician approval gate. If the clinician edited the plan on screen,
      // send THAT (merged over the extracted base so protocols/targets survive);
      // otherwise extract fresh from the transcript.
      const base = await extractPlan(body.transcript || CONSULT_TRANSCRIPT);
      const edited = body.plan as Partial<CarePlan> | undefined;
      const plan: CarePlan = edited
        ? {
            ...base,
            ...edited,
            // These are authored server-side, never overwritten by the edit.
            protocols: base.protocols,
            glucoseTarget: base.glucoseTarget,
          }
        : base;
      const state = setState({
        plan,
        planSent: true,
        glucoseReadings: seedGlucoseHistory(),
      });
      return NextResponse.json(state);
    }

    case "checkIn": {
      const checkIn = body.checkIn as CheckIn;
      if (!checkIn?.symptom) {
        return NextResponse.json(
          { error: "checkIn.symptom is required" },
          { status: 400 },
        );
      }
      const current = getState();
      const response = await respondToCheckIn(checkIn, current.plan);
      setState({ latestResponse: response });
      if (response.escalate) {
        const item: InboxItem = {
          id: `inbox-${Date.now()}`,
          kind: "check-in",
          checkIn,
          response,
          read: false,
        };
        addInboxItem(item);
      }
      return NextResponse.json({ response, state: getState() });
    }

    case "logGlucose": {
      const current = getState();
      const target = current.plan?.glucoseTarget ?? { low: 4, high: 7 };
      const value = Number(body.value);
      if (!Number.isFinite(value)) {
        return NextResponse.json(
          { error: "A numeric value is required" },
          { status: 400 },
        );
      }
      const flagged = isFlagged(value, target);
      const reading: GlucoseReading = {
        id: `glu-${Date.now()}`,
        value,
        context: body.context === "post-meal" ? "post-meal" : "fasting",
        loggedAt: new Date().toISOString(),
        flagged,
      };
      addGlucoseReading(reading);
      const response = respondToGlucose(reading, target);
      setState({ latestResponse: response });
      if (response.escalate) {
        const item: InboxItem = {
          id: `inbox-${Date.now()}`,
          kind: "glucose",
          reading,
          response,
          read: false,
        };
        addInboxItem(item);
      }
      const state = getState();
      const trend = computeTrend(state.glucoseReadings, target);
      return NextResponse.json({ reading, response, trend, state });
    }

    case "markRead": {
      const state = markInboxRead(body.id);
      return NextResponse.json(state);
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 },
      );
  }
}
