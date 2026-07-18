#!/usr/bin/env node
/**
 * Cadence smoke test — walks the full demo choreography against a running API
 * and asserts every FR-critical state transition (see FRD.md).
 *
 * Usage:  node scripts/smoke.mjs [baseUrl]     (default http://localhost:3001)
 * Exit 0 = demo path green. Any assertion failure exits 1 with context.
 */

const BASE = process.argv[2] ?? 'http://localhost:3001';

let step = 0;
function pass(name) {
  step += 1;
  console.log(`  ✓ ${String(step).padStart(2)} ${name}`);
}
function fail(name, detail) {
  console.error(`  ✗ ${name}`);
  if (detail !== undefined) console.error('    ', detail);
  process.exit(1);
}
function assert(cond, name, detail) {
  cond ? pass(name) : fail(name, detail);
}

async function api(body) {
  const res = await fetch(`${BASE}/api/state`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    fail(`${body?.action ?? 'GET'} returned ${res.status}`, detail);
  }
  return res.json();
}

console.log(`\nCadence smoke — ${BASE}\n`);

// ── Health ────────────────────────────────────────────────────────────────
const health = await fetch(`${BASE}/health`).then((r) => r.json());
assert(health.status === 'ok', `health ok (aiMode=${health.aiMode})`, health);

// ── Reset to seeded state (FR-6.4) ────────────────────────────────────────
let s = await api({ action: 'reset' });
assert(s.onboarded === false && s.plan === null, 'reset → seeded, not onboarded');
assert(s.patient?.name && s.patient.medication?.titrationPlan?.length > 0,
  `seed patient present (${s.patient?.name}) with titration plan (FR-1.1)`);
assert(s.coachThread.length === 1 && s.coachThread[0].role === 'coach',
  'coach welcome message seeded');
assert(s.escalations.length === 0 && s.logs.length === 0, 'queue and logs empty');

// ── Beat 1: onboard → plan (FR-1.2, FR-1.3) ──────────────────────────────
s = await api({ action: 'onboard' });
assert(s.onboarded === true && s.plan, 'onboard → plan generated (FR-1.2)');
assert(s.plan.calorieRange.min >= s.plan.constraints.calorieFloor,
  `calorie rail holds: ${s.plan.calorieRange.min} >= floor ${s.plan.constraints.calorieFloor} (FR-1.3)`);
assert(s.plan.proteinTargetG >= s.plan.constraints.proteinFloor,
  `protein rail holds: ${s.plan.proteinTargetG}g >= floor ${s.plan.constraints.proteinFloor}g (FR-1.3)`);
assert(s.plan.dailyActions.length > 0 && s.plan.summary,
  'plan has daily actions + plain-language summary');

// ── Beat 2: coach nausea question (FR-2.1–2.3) ───────────────────────────
s = await api({ action: 'coach', text: 'I have nausea since the injection' });
const coachReply = s.coachThread.at(-1);
assert(coachReply.role === 'coach', 'coach replied (FR-2.1)');
assert(Boolean(coachReply.sourceProtocolId),
  `medical reply carries protocol provenance: ${coachReply.sourceProtocolId} (FR-2.2)`);

// ── FR-2.4: unmatched question must escalate, never answer medically ─────
const before = s.escalations.length;
s = await api({ action: 'coach', text: 'Can I take my cousin’s leftover antibiotics?' });
const unmatched = s.coachThread.at(-1);
assert(!unmatched.sourceProtocolId, 'unmatched question → no invented protocol (FR-2.4)');
assert(s.escalations.length === before + 1,
  'unmatched question → escalated to human (FR-2.4/FR-4.1)');

// ── Beat 3: logs, game layer (FR-3.x) ─────────────────────────────────────
s = await api({ action: 'log', type: 'injection', payload: { missed: false } });
assert(s.game.streaks.injection === 1 && s.game.points > 0,
  `injection log → streak 1, ${s.game.points} pts (FR-3.2/3.3)`);
assert(typeof s.latestReview === 'string' && s.latestReview.length > 0,
  'log triggered closed-loop review (FR-5.1)');

s = await api({ action: 'log', type: 'meal', payload: { proteinG: 35 } });
const quest = s.game.activeQuests.find((q) => q.id === 'quest-protein');
assert(!quest || quest.progress >= 35, 'meal log advances protein quest (FR-3.5)');

const pointsBeforeMiss = s.game.points;
const streakBeforeMiss = s.game.streaks.injection;
s = await api({ action: 'log', type: 'injection', payload: { missed: true } });
assert(s.game.streakRepairUsed === true, 'missed dose → streak repair flagged (FR-3.4)');
assert(s.game.streaks.injection === streakBeforeMiss,
  'missed dose does NOT punish the injection streak (FR-3.4)');
assert(s.game.points > pointsBeforeMiss, 'honesty still rewarded (FR-3.4)');

// ── Beat 3b→4: moderate symptom → escalation (FR-4.1–4.3) ────────────────
const openBefore = s.escalations.filter((e) => e.status === 'open').length;
s = await api({
  action: 'log', type: 'symptom',
  payload: { symptom: 'Nausea', note: 'since this morning' }, severity: 'moderate',
});
const opens = s.escalations.filter((e) => e.status === 'open');
assert(opens.length === openBefore + 1,
  'moderate nausea → escalation created by code threshold (FR-4.1)');
assert(opens[0].aiSnapshot.length > 0 && opens[0].reason,
  'escalation carries reason + AI snapshot (FR-4.2)');
const symptomReply = s.coachThread.at(-1);
assert(symptomReply.sourceProtocolId,
  'patient still got protocol guidance alongside the flag (FR-4.5)');

// ── Beat 5: resolve → rd message in patient thread (FR-4.4) ───────────────
const escId = opens[0].id;
s = await api({ action: 'resolve', escalationId: escId, note: 'Smaller meals + hydration; call if vomiting.' });
const resolved = s.escalations.find((e) => e.id === escId);
assert(resolved.status === 'resolved' && resolved.clinicianNote, 'escalation resolved with note (FR-4.4)');
const rdMsg = s.coachThread.at(-1);
assert(rdMsg.role === 'rd' && rdMsg.text.includes('Smaller meals'),
  'clinician note delivered into patient thread as rd message (FR-4.4)');

// ── Full-state poll parity (FR-6.2) ───────────────────────────────────────
const polled = await api();
assert(polled.updatedAt === s.updatedAt && polled.escalations.length === s.escalations.length,
  'GET /api/state returns identical state to last mutation (FR-6.2)');

// ── Bad input handling ────────────────────────────────────────────────────
const bad = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'coach' }),
});
assert(bad.status === 400, 'coach without text → 400');

// ══ Consult-to-home handoff flow (the design demo) ════════════════════════

// ── Reset, then the REAL entry flow: paste → extract → review → send ──────
s = await api({ action: 'reset' });
assert(s.planSent === false && s.handoffPlan === null && s.inbox.length === 0,
  'reset → handoff state clean');
assert(s.draftPlan === null && s.patientInbox.length === 0,
  'reset → no draft, patient inbox empty');

const badExtract = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'extract', transcript: '  ' }),
});
assert(badExtract.status === 400, 'extract without transcript → 400');

s = await api({
  action: 'extract',
  transcript: 'Dr: increasing metformin to 1000mg twice daily; starting semaglutide weekly.',
});
assert(s.draftPlan !== null && s.draftPlan.medications.length > 0,
  'extract → AI draft plan created for clinician review');
assert(s.planSent === false && s.handoffPlan === null,
  'draft is NOT patient-visible before approval');

s = await api({ action: 'sendPlan' });
assert(s.planSent === true && s.handoffPlan?.patientName === 'Meera',
  'sendPlan → reviewed draft published to the patient');
assert(s.draftPlan === null, 'draft cleared after send');
assert(s.handoffPlan.medications.length === 2 && s.handoffPlan.protocols.length === 2,
  'plan carries medications + clinician-authored protocols');
assert(s.glucoseReadings.length > 0, 'glucose history seeded with the plan');
assert(s.patientInbox.length === 1 && s.patientInbox[0].kind === 'plan',
  'patient inbox received the plan-arrival message');

// ── Clinician dose edit survives the send, protocols stay server-authored ─
s = await api({ action: 'reset' });
s = await api({
  action: 'sendPlan',
  plan: { medications: [{ id: 'med-metformin', name: 'Metformin', dose: '850 mg, twice a day', schedule: 'With meals', why: 'edited', status: 'adjusted' }] },
});
assert(s.handoffPlan.medications[0].dose === '850 mg, twice a day',
  'clinician dose edit is what the patient receives');
assert(s.handoffPlan.protocols.length === 2,
  'safety protocols survive the edit (server-authored, never overwritten)');

// ── Handoff beat 2: moderate nausea check-in → protocol + inbox flag ──────
s = await api({
  action: 'checkIn',
  checkIn: { symptom: 'Nausea', severity: 'moderate', note: 'Queasy since the injection', loggedAt: new Date().toISOString() },
});
assert(s.latestResponse?.escalate === true && s.latestResponse.protocolSteps.length > 0,
  'moderate nausea → clinician protocol served + escalated');
assert(s.inbox.length === 1 && s.inbox[0].kind === 'check-in' && !s.inbox[0].read,
  'check-in landed in the clinician inbox');
assert(s.patientInbox[0].kind === 'check-in' && s.patientInbox[0].escalated === true,
  'patient inbox received the check-in reply (marked escalated)');

// ── Mild check-in does NOT flood the inbox ────────────────────────────────
s = await api({
  action: 'checkIn',
  checkIn: { symptom: 'Nausea', severity: 'mild', loggedAt: new Date().toISOString() },
});
assert(s.inbox.length === 1, 'mild nausea → protocol served, no new inbox flag');

// ── Handoff beat 3: glucose readings against the clinician target ─────────
const glucoseCountBefore = s.glucoseReadings.length;
s = await api({ action: 'logGlucose', value: 6.2, context: 'fasting' });
assert(s.glucoseReadings.length === glucoseCountBefore + 1, 'in-range reading logged');
assert(s.latestResponse.escalate === false, 'in-range reading → no escalation');
assert(s.inbox.length === 1, 'in-range reading does not flag the inbox');

s = await api({ action: 'logGlucose', value: 11.9, context: 'fasting' });
assert(s.glucoseReadings.at(-1).flagged === true, 'above-target reading flagged (11.9 > 7)');
assert(s.inbox.length === 2 && s.inbox[0].kind === 'glucose',
  'flagged reading escalated to the clinician inbox');

// ── Handoff beat 4: clinician marks the flag read ─────────────────────────
s = await api({ action: 'markRead', id: s.inbox[0].id });
assert(s.inbox[0].read === true, 'markRead → inbox item read');

// ── Patient onboarding: consent is load-bearing ───────────────────────────
const noConsent = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'patientOnboard',
    profile: { name: 'Meera', consentGiven: false, remindersEnabled: true },
  }),
});
assert(noConsent.status === 400, 'onboarding without consent → 400 (consent is required)');

s = await api({
  action: 'patientOnboard',
  profile: { name: 'Meera', consentGiven: true, remindersEnabled: true, injectionDay: 'Sun' },
});
assert(s.patientProfile?.consentGiven === true && s.patientProfile.injectionDay === 'Sun',
  'onboarding with consent → profile stored');

// ── Explainer: generated once, cached on the plan ─────────────────────────
s = await api({ action: 'explain' });
assert(s.explainer !== null && s.explainer.levels.length === 4,
  'explain → 4 progressive levels generated');
const cachedTitle = s.explainer.title;
s = await api({ action: 'explain' });
assert(s.explainer.title === cachedTitle, 'explain again → served from cache');

// ── Reset leaves it clean for the next rehearsal (FR-6.4) ─────────────────
s = await api({ action: 'reset' });
assert(!s.onboarded && s.escalations.length === 0 && !s.planSent && s.inbox.length === 0,
  'final reset → clean seeded state (FR-6.4)');

console.log(`\nAll ${step} checks passed — demo choreography is green.\n`);
