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

// ══ Consult-to-home handoff flow — multi-patient (the real app) ═══════════

const TRANSCRIPT =
  'Dr: increasing metformin to 1000mg twice daily; starting semaglutide weekly injection.';

// ── Reset → clean multi-patient state ─────────────────────────────────────
s = await api({ action: 'reset' });
assert(Array.isArray(s.records) && s.records.length === 0 && s.inbox.length === 0,
  'reset → no records, clinic inbox empty');

// ── Clinician creates the patient record and issues the code ──────────────
const badCreate = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'createPatient', name: ' ' }),
});
assert(badCreate.status === 400, 'createPatient without name → 400');

s = await api({ action: 'createPatient', name: 'Meera', details: 'T2D review' });
const meera = s.records[0];
assert(/^CAD-[A-Z2-9]{4}$/.test(meera.id),
  `record created with clinician-issued code (${meera.id})`);
assert(meera.planSent === false && meera.profile === null && meera.streakDays === 0,
  'new record starts clean: no plan, no profile, streak 0');

// ── Unknown patient id is rejected ─────────────────────────────────────────
const bad404 = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'extract', patientId: 'CAD-ZZZZ', transcript: TRANSCRIPT }),
});
assert(bad404.status === 404, 'action against unknown patient id → 404');

// ── Extract → draft on the record, never patient-visible ──────────────────
s = await api({ action: 'extract', patientId: meera.id, transcript: TRANSCRIPT });
let rec = s.records.find((r) => r.id === meera.id);
assert(rec.draftPlan !== null && rec.draftPlan.medications.length > 0,
  'extract → AI draft on the record (FR: clinician review)');
assert(rec.planSent === false && rec.plan === null,
  'draft is NOT patient-visible before approval');

// ── sendPlan cannot fire without a reviewed draft ──────────────────────────
s = await api({ action: 'createPatient', name: 'John', details: 'Hypertension' });
const john = s.records.find((r) => r.name === 'John');
const noDraft = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'sendPlan', patientId: john.id }),
});
assert(noDraft.status === 400, 'sendPlan without an extracted draft → 400');

// ── Approve & send: plan published, streak seeded, inbox message ──────────
s = await api({ action: 'sendPlan', patientId: meera.id });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.planSent === true && rec.plan !== null && rec.draftPlan === null,
  'sendPlan → reviewed draft published, draft cleared');
assert(rec.plan.patientName === 'Meera', 'plan carries the record name');
assert(rec.plan.protocols.length === 2, 'clinician-authored protocols attached');
assert(rec.glucoseReadings.length > 0 && rec.streakDays > 0,
  'glucose history + streak seeded with the plan');
assert(rec.inbox.length === 1 && rec.inbox[0].kind === 'plan',
  "patient's inbox received the plan-arrival message");

// ── Records are isolated: John untouched by Meera's plan ──────────────────
const johnRec = s.records.find((r) => r.id === john.id);
assert(johnRec.planSent === false && johnRec.inbox.length === 0,
  "second record is isolated — John unaffected by Meera's send");

// ── Dose edit survives the send; protocols stay server-authored ───────────
await api({ action: 'extract', patientId: john.id, transcript: TRANSCRIPT });
s = await api({
  action: 'sendPlan',
  patientId: john.id,
  plan: { medications: [{ id: 'med-metformin', name: 'Metformin', dose: '850 mg, twice a day', schedule: 'With meals', why: 'edited', status: 'adjusted' }] },
});
rec = s.records.find((r) => r.id === john.id);
assert(rec.plan.medications[0].dose === '850 mg, twice a day',
  'clinician dose edit is what the patient receives');
assert(rec.plan.protocols.length === 2,
  'safety protocols survive the edit (server-authored)');

// ── Patient onboarding on THEIR record: consent is load-bearing ────────────
const noConsent = await fetch(`${BASE}/api/state`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'patientOnboard',
    patientId: meera.id,
    profile: { name: 'Meera', consentGiven: false, remindersEnabled: true },
  }),
});
assert(noConsent.status === 400, 'onboarding without consent → 400');

s = await api({
  action: 'patientOnboard',
  patientId: meera.id,
  profile: { name: 'Meera', consentGiven: true, remindersEnabled: true, injectionDay: 'Sun' },
});
rec = s.records.find((r) => r.id === meera.id);
assert(rec.profile?.consentGiven === true && rec.profile.injectionDay === 'Sun',
  'onboarding stored on the record');

// ── Daily rhythm is server-tracked (refresh-proof) ─────────────────────────
const streakBefore = rec.streakDays;
s = await api({ action: 'toggleTask', patientId: meera.id, taskId: 'walk' });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.tasksDone.includes('walk'), 'task completion recorded server-side');
const polled2 = await api();
assert(polled2.records.find((r) => r.id === meera.id).tasksDone.includes('walk'),
  'task completion survives a fresh state read (refresh-proof)');
s = await api({ action: 'toggleTask', patientId: meera.id, taskId: 'walk' });
rec = s.records.find((r) => r.id === meera.id);
assert(!rec.tasksDone.includes('walk') && rec.streakDays === streakBefore,
  'toggle off works; same-day toggles never inflate the streak');

// ── Check-in: protocol served, both inboxes correct ────────────────────────
s = await api({
  action: 'checkIn',
  patientId: meera.id,
  checkIn: { symptom: 'Nausea', severity: 'moderate', note: 'Queasy since the injection', loggedAt: new Date().toISOString() },
});
rec = s.records.find((r) => r.id === meera.id);
assert(rec.latestResponse?.escalate === true && rec.latestResponse.protocolSteps.length > 0,
  'moderate nausea → clinician protocol served + escalated');
assert(rec.inbox[0].kind === 'check-in' && rec.inbox[0].escalated === true,
  "patient's inbox got the reply (marked escalated)");
assert(s.inbox.length === 1 && s.inbox[0].patientId === meera.id && s.inbox[0].patientName === 'Meera',
  'clinic inbox flag carries patient identity');

s = await api({
  action: 'checkIn',
  patientId: meera.id,
  checkIn: { symptom: 'Nausea', severity: 'mild', loggedAt: new Date().toISOString() },
});
assert(s.inbox.length === 1, 'mild nausea → no new clinic flag');

// ── Glucose against the clinician target, per record ───────────────────────
const gBefore = s.records.find((r) => r.id === meera.id).glucoseReadings.length;
s = await api({ action: 'logGlucose', patientId: meera.id, value: 6.2, context: 'fasting' });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.glucoseReadings.length === gBefore + 1 && rec.latestResponse.escalate === false,
  'in-range reading logged, no escalation');
s = await api({ action: 'logGlucose', patientId: meera.id, value: 11.9, context: 'fasting' });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.glucoseReadings.at(-1).flagged === true, 'above-target reading flagged');
assert(s.inbox.length === 2 && s.inbox[0].kind === 'glucose' && s.inbox[0].patientName === 'Meera',
  'flagged reading escalated to clinic inbox with identity');

// ── Clinician marks the flag read ──────────────────────────────────────────
s = await api({ action: 'markRead', id: s.inbox[0].id });
assert(s.inbox[0].read === true, 'markRead → inbox item read');

// ── Transcript persisted with the record (refresh-proof source) ───────────
rec = s.records.find((r) => r.id === meera.id);
assert(rec.transcript === TRANSCRIPT, 'source transcript stored on the record');

// ── Post-send plan UPDATE: edit → re-send, patient notified, rhythm kept ──
const inboxBefore = rec.inbox.length;
const streakKeep = rec.streakDays;
s = await api({
  action: 'sendPlan',
  patientId: meera.id,
  plan: { medications: [{ id: 'med-metformin', name: 'Metformin', dose: '500 mg, twice a day', schedule: 'With meals', why: 'dose reduced', status: 'adjusted' }] },
});
rec = s.records.find((r) => r.id === meera.id);
assert(rec.plan.medications[0].dose === '500 mg, twice a day',
  'post-send edit → patient receives the updated dose');
assert(rec.inbox.length === inboxBefore + 1 && rec.inbox[0].title.includes('updated'),
  'patient notified of the plan update');
assert(rec.streakDays === streakKeep && rec.glucoseReadings.length > 0,
  "an update never resets the patient's streak or readings");

// ── Clinician AUTHORS new sections: red flag + protocol via edit ───────────
s = await api({
  action: 'sendPlan',
  patientId: meera.id,
  plan: {
    redFlags: [...rec.plan.redFlags, { id: 'flag-custom', symptom: 'Chest pain', action: 'Call 999 immediately' }],
    protocols: [...rec.plan.protocols, { id: 'proto-custom', trigger: 'dizzy', label: 'Dizziness', steps: ['Sit down', 'Sip water slowly'], escalateWhen: 'If it persists beyond an hour' }],
  },
});
rec = s.records.find((r) => r.id === meera.id);
assert(rec.plan.redFlags.some((f) => f.symptom === 'Chest pain'),
  'clinician-added red flag reaches the patient plan');
assert(rec.plan.protocols.length === 3,
  'clinician-authored protocol attached alongside the originals');
assert(s.auditLog[0].changes?.some((c) => c.includes('+ red flag: Chest pain')) &&
  s.auditLog[0].changes?.some((c) => c.includes('+ protocol: Dizziness')),
  'audit diff shows the additions (+ lines)');

// An abandoned editor Add (blank "New medication") never reaches the patient.
s = await api({
  action: 'sendPlan',
  patientId: meera.id,
  plan: {
    medications: [
      ...rec.plan.medications,
      { id: 'med-blank', name: 'New medication', dose: '', schedule: '', why: '', status: 'new' },
    ],
  },
});
rec = s.records.find((r) => r.id === meera.id);
assert(!rec.plan.medications.some((m) => m.name === 'New medication'),
  'blank editor leftovers pruned before reaching the patient');

// The new protocol is live: a matching check-in serves ITS steps.
s = await api({
  action: 'checkIn',
  patientId: meera.id,
  checkIn: { symptom: 'Dizzy spells', severity: 'mild', loggedAt: new Date().toISOString() },
});
rec = s.records.find((r) => r.id === meera.id);
assert(rec.latestResponse.protocolSteps.includes('Sit down'),
  "patient check-in matches the clinician's new protocol");

// ── Audit log: the trail exists and reads correctly ────────────────────────
assert(Array.isArray(s.auditLog) && s.auditLog.length > 0, 'audit log populated');
assert(s.auditLog[0].event === 'plan.updated' && s.auditLog[0].actor === 'clinician',
  'newest audit entry is the plan update (clinician)');
assert(s.auditLog.some((e) => e.event === 'record.created'),
  'audit trail includes record creation');
assert(s.auditLog.some((e) => e.event === 'checkin.flagged' && e.actor === 'patient'),
  'audit trail includes patient-side flagged check-in');

// ── Record CRUD: update + delete ───────────────────────────────────────────
s = await api({ action: 'updatePatient', patientId: meera.id, name: 'Meera K', details: 'T2D, semaglutide titration' });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.name === 'Meera K' && rec.plan.patientName === 'Meera K',
  'updatePatient → renames record AND the plan display name');
s = await api({ action: 'createPatient', name: 'ToDelete' });
const doomed = s.records.find((r) => r.name === 'ToDelete');
s = await api({ action: 'deletePatient', patientId: doomed.id });
assert(!s.records.some((r) => r.id === doomed.id), 'deletePatient → record removed');
assert(s.records.some((r) => r.id === meera.id) && s.records.some((r) => r.id === john.id),
  'other records untouched by delete');
assert(s.inbox.every((i) => i.patientId !== doomed.id),
  "deleted patient's flags leave the clinic inbox");

// ── Patient data isolation: scoped responses carry ONLY the own record ─────
const scoped = await fetch(`${BASE}/api/state?scope=patient&patientId=${meera.id}`).then((r) => r.json());
assert(scoped.patient?.id === meera.id, 'scoped GET returns the own record');
assert(!('records' in scoped) && !('inbox' in scoped) && !('auditLog' in scoped),
  'scoped GET leaks NO roster, clinic inbox, or audit log');
const scopedPost = await fetch(`${BASE}/api/state?scope=patient&patientId=${meera.id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'toggleTask', patientId: meera.id, taskId: 'task-med-metformin' }),
}).then((r) => r.json());
assert(scopedPost.patient?.id === meera.id && !('records' in scopedPost),
  'scoped POST responses are isolated too');
const scopedUnknown = await fetch(`${BASE}/api/state?scope=patient&patientId=CAD-ZZZZ`).then((r) => r.json());
assert(scopedUnknown.patient === null, 'scoped GET with unknown code → patient null (sign-in validation)');

// ── Explainer: generated per record, cached ────────────────────────────────
s = await api({ action: 'explain', patientId: meera.id });
rec = s.records.find((r) => r.id === meera.id);
assert(rec.explainer !== null && rec.explainer.levels.length === 4,
  'explain → 4 progressive levels on the record');
const cachedTitle = rec.explainer.title;
s = await api({ action: 'explain', patientId: meera.id });
assert(s.records.find((r) => r.id === meera.id).explainer.title === cachedTitle,
  'explain again → served from cache');

// ── Reset leaves it clean for the next rehearsal ───────────────────────────
s = await api({ action: 'reset' });
assert(!s.onboarded && s.escalations.length === 0 && s.records.length === 0 && s.inbox.length === 0,
  'final reset → clean seeded state');

console.log(`\nAll ${step} checks passed — demo choreography is green.\n`);
