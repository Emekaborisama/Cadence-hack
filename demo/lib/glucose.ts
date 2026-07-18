import type {
  CheckInResponse,
  GlucoseReading,
  GlucoseTarget,
  GlucoseTrend,
} from "./types";

// Deterministic glucose analysis — the "turn complex data into simple advice"
// job. Kept pure (no LLM) so the demo is reliable and offline-safe.

export function isFlagged(value: number, target: GlucoseTarget): boolean {
  return value > target.high || value < target.low;
}

// Plain-language trend from the reading history (oldest first).
export function computeTrend(
  readings: GlucoseReading[],
  target: GlucoseTarget,
): GlucoseTrend {
  if (readings.length === 0) {
    return { direction: "steady", readOut: "No readings yet.", latest: null, inRangePct: 0 };
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

  let direction: GlucoseTrend["direction"] = "steady";
  if (delta <= -0.4) direction = "down";
  else if (delta >= 0.4) direction = "up";

  const nearTarget = latest <= target.high + 0.3;
  let readOut: string;
  if (direction === "down" && nearTarget) {
    readOut = `Your morning readings are trending down and closing in on your ${target.low}–${target.high} target. Nice work, keep going.`;
  } else if (direction === "down") {
    readOut = `Your morning readings are trending down. You're heading in the right direction toward your ${target.low}–${target.high} target.`;
  } else if (direction === "up") {
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
        "Have something sugary right away, like juice or glucose tablets.",
        "Recheck in 15 minutes and repeat if you're still low.",
        "Have a snack with carbs once you feel better.",
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
        "Drink some water and stay active if you can.",
        "Check whether anything unusual affected this reading (a big meal, stress, illness).",
        "Keep logging so your care team can see the pattern.",
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
      "Log your next reading at your usual time.",
    ],
    escalate: false,
  };
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
