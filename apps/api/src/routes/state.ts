import { randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type {
  Escalation,
  GlucoseReading,
  HandoffPlan,
  LogEntry,
  PatientRecord,
  StateAction,
} from '@cadence/shared';
import {
  isFlagged,
  respondToGlucose,
  seedGlucoseHistory,
  STREAK_DAYS,
} from '@cadence/shared';
import {
  coachRespond,
  explainConcept,
  extractPlan,
  generatePlan,
  respondToCheckIn,
  reviewLogs,
} from '../ai.js';
import {
  addCoachMessage,
  addEscalation,
  addInboxItem,
  addLog,
  addPatientMessage,
  addRecord,
  audit,
  getRecord,
  getState,
  markInboxRead,
  resetState,
  setGame,
  setPlan,
  setState,
  updateEscalation,
  updateRecord,
} from '../store.js';
import { env } from '../env.js';

export const stateRouter: Router = Router();

// Clinician-issued patient code — short, unambiguous, typeable on a phone.
function newPatientCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(4);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `CAD-${code}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Human-readable diff between two plans, for the audit trail. Line prefixes:
// "+" added, "−" removed, "~" changed.
function diffPlans(prev: HandoffPlan, next: HandoffPlan): string[] {
  const lines: string[] = [];
  const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));

  const prevMeds = byId(prev.medications);
  const nextMeds = byId(next.medications);
  for (const [id, m] of nextMeds) {
    const old = prevMeds.get(id);
    if (!old) lines.push(`+ medication: ${m.name} ${m.dose}`);
    else if (old.dose !== m.dose) lines.push(`~ ${m.name} dose: ${old.dose} → ${m.dose}`);
    else if (old.name !== m.name) lines.push(`~ medication renamed: ${old.name} → ${m.name}`);
  }
  for (const [id, m] of prevMeds) if (!nextMeds.has(id)) lines.push(`− medication: ${m.name}`);

  const listDiff = <T extends { id: string }>(
    label: string,
    prevArr: T[],
    nextArr: T[],
    show: (x: T) => string,
  ) => {
    const p = byId(prevArr);
    const n = byId(nextArr);
    for (const [id, x] of n) {
      const old = p.get(id);
      if (!old) lines.push(`+ ${label}: ${show(x)}`);
      else if (show(old) !== show(x)) lines.push(`~ ${label}: ${show(old)} → ${show(x)}`);
    }
    for (const [id, x] of p) if (!n.has(id)) lines.push(`− ${label}: ${show(x)}`);
  };

  listDiff('titration', prev.titrationSteps, next.titrationSteps, (t) => `${t.label} ${t.dose}`);
  listDiff('action', prev.lifestyleActions, next.lifestyleActions, (a) => a.title);
  listDiff('red flag', prev.redFlags, next.redFlags, (f) => f.symptom);
  listDiff('protocol', prev.protocols, next.protocols, (p) => p.label || p.trigger);
  listDiff('follow-up', prev.appointments, next.appointments, (a) => `${a.title} (${a.when})`);

  if (
    prev.glucoseTarget.low !== next.glucoseTarget.low ||
    prev.glucoseTarget.high !== next.glucoseTarget.high
  ) {
    lines.push(
      `~ glucose target: ${prev.glucoseTarget.low}–${prev.glucoseTarget.high} → ${next.glucoseTarget.low}–${next.glucoseTarget.high} mmol/L`,
    );
  }
  return lines;
}

// Resolve a record or respond 404. Returns undefined after sending the error.
function requireRecord(
  res: Response,
  patientId: string | undefined,
): PatientRecord | undefined {
  if (!patientId?.trim()) {
    res.status(400).json({ error: 'patientId is required' });
    return undefined;
  }
  const record = getRecord(patientId);
  if (!record) {
    res.status(404).json({ error: `No patient record for id ${patientId}` });
    return undefined;
  }
  return record;
}

stateRouter.get('/', (_req: Request, res: Response) => {
  res.json({ ...getState(), aiMode: env.aiMode });
});

stateRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body as StateAction;
  const action = body?.action;

  try {
    switch (action) {
      case 'onboard': {
        const state = getState();
        const plan = await generatePlan(state.patient);
        setPlan(plan);
        addCoachMessage({
          id: `msg-${Date.now()}`,
          threadId: 'thread-meera',
          role: 'coach',
          text: `Your week-one plan is ready: ${plan.proteinTargetG}g protein, ${plan.stepTarget} steps, calories ${plan.calorieRange.min}–${plan.calorieRange.max}. ${plan.summary}`,
          timestamp: new Date().toISOString(),
        });
        return res.json(getState());
      }

      case 'coach': {
        const text = (body as Extract<StateAction, { action: 'coach' }>).text?.trim();
        if (!text) {
          return res.status(400).json({ error: 'text is required' });
        }
        const state = getState();
        addCoachMessage({
          id: `msg-user-${Date.now()}`,
          threadId: 'thread-meera',
          role: 'patient',
          text,
          timestamp: new Date().toISOString(),
        });

        const severity =
          /severe|can't keep|cannot keep|chest pain|emergency/i.test(text)
            ? 'severe'
            : /moderate|pretty bad|worse/i.test(text)
              ? 'moderate'
              : 'mild';

        const result = await coachRespond(state.patient, text, severity);
        addCoachMessage(result.message);

        if (result.escalate) {
          const esc: Escalation = {
            id: `esc-${Date.now()}`,
            patientId: state.patient.id,
            reason: result.reason || 'Coach escalation',
            triggeredBy: result.message.id,
            aiSnapshot: [
              `${state.patient.name} · ${state.patient.condition}`,
              `Med: ${state.patient.medication.name} ${state.patient.medication.currentDose}`,
              `Message: "${text}"`,
              `Coach reply grounded in protocol: ${result.message.sourceProtocolId ?? 'none (unmatched)'}`,
              `A1c ${state.patient.baselineLabs.a1c}, weight ${state.patient.baselineLabs.weightKg}kg`,
            ].join('\n'),
            status: 'open',
            createdAt: new Date().toISOString(),
          };
          addEscalation(esc);
        }

        return res.json(getState());
      }

      case 'log': {
        const { type, payload = {}, severity } = body as Extract<
          StateAction,
          { action: 'log' }
        >;
        if (!type) {
          return res.status(400).json({ error: 'type is required' });
        }

        const state = getState();
        const entry: LogEntry = {
          id: `log-${Date.now()}`,
          patientId: state.patient.id,
          type,
          payload: { ...payload, severity },
          timestamp: new Date().toISOString(),
          reviewed: false,
        };

        const game = structuredClone(state.game);

        if (type === 'injection') {
          const missed = Boolean(payload.missed);
          if (missed) {
            game.streakRepairUsed = true;
            game.points += 5;
            entry.aiFeedback =
              'Miss logged — streak preserved. Honesty beats a silent skip.';
          } else {
            game.streaks.injection += 1;
            game.points += 20;
          }
          game.streaks.logging += 1;
        } else if (type === 'meal') {
          const protein = Number(payload.proteinG) || 30;
          game.streaks.logging += 1;
          game.points += 10;
          const quest = game.activeQuests.find((q) => q.id === 'quest-protein');
          if (quest) quest.progress = Math.min(quest.goal, quest.progress + protein);
        } else if (type === 'biomarker') {
          game.streaks.logging += 1;
          game.points += 10;
          if (!game.nonScaleVictories.includes('Logged a biomarker')) {
            game.nonScaleVictories.push('Logged a biomarker');
          }
        } else if (type === 'symptom') {
          game.streaks.logging += 1;
          game.points += 8;
        }

        if (game.points >= 100) game.level = Math.max(game.level, 2);

        addLog(entry);
        setGame(game);

        // Symptom logs also run protocol matching + possible escalation.
        if (type === 'symptom') {
          const symptomText = String(payload.symptom || payload.note || 'symptom');
          const result = await coachRespond(
            state.patient,
            symptomText,
            severity || 'moderate',
          );
          addCoachMessage(result.message);
          if (result.escalate) {
            addEscalation({
              id: `esc-${Date.now()}`,
              patientId: state.patient.id,
              reason: result.reason || `Symptom: ${symptomText}`,
              triggeredBy: entry.id,
              aiSnapshot: [
                `${state.patient.name} logged ${symptomText} (${severity || 'moderate'})`,
                `Protocol: ${result.message.sourceProtocolId ?? 'unmatched'}`,
                `Injection streak: ${game.streaks.injection}, logging streak: ${game.streaks.logging}`,
              ].join('\n'),
              status: 'open',
              createdAt: new Date().toISOString(),
            });
          }
        }

        const feedback = await reviewLogs(getState().logs);
        setState({
          latestReview: feedback,
          logs: getState().logs.map((l) =>
            l.id === entry.id ? { ...l, reviewed: true, aiFeedback: l.aiFeedback || feedback } : l,
          ),
        });

        return res.json(getState());
      }

      case 'resolve': {
        const { escalationId, note } = body as Extract<
          StateAction,
          { action: 'resolve' }
        >;
        if (!escalationId) {
          return res.status(400).json({ error: 'escalationId is required' });
        }
        updateEscalation(escalationId, {
          status: 'resolved',
          clinicianNote: note || 'Reviewed by RD — patient messaged.',
        });
        addCoachMessage({
          id: `msg-rd-${Date.now()}`,
          threadId: 'thread-meera',
          role: 'rd',
          text:
            note ||
            'Your dietitian reviewed the flag and is with you. Keep logging — we adjusted your plan support.',
          timestamp: new Date().toISOString(),
        });
        return res.json(getState());
      }

      case 'createPatient': {
        // The clinician creates the record and hands the code to the patient.
        // Identity originates on the care-provider side, never self-asserted.
        const { name, details } = body as Extract<
          StateAction,
          { action: 'createPatient' }
        >;
        if (!name?.trim()) {
          return res.status(400).json({ error: 'name is required' });
        }
        const record: PatientRecord = {
          id: newPatientCode(),
          name: name.trim(),
          details: details?.trim() || undefined,
          createdAt: new Date().toISOString(),
          profile: null,
          planSent: false,
          draftPlan: null,
          plan: null,
          latestResponse: null,
          glucoseReadings: [],
          inbox: [],
          explainer: null,
          streakDays: 0,
          taskDate: today(),
          tasksDone: [],
        };
        addRecord(record);
        audit('clinician', 'record.created', {
          patientId: record.id,
          patientName: record.name,
          detail: record.details,
        });
        return res.json(getState());
      }

      case 'updatePatient': {
        const { patientId, name, details } = body as Extract<
          StateAction,
          { action: 'updatePatient' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        const patch: Partial<PatientRecord> = {};
        if (name?.trim()) patch.name = name.trim();
        if (details !== undefined) patch.details = details.trim() || undefined;
        updateRecord(record.id, patch);
        // Keep the plan's display name in step with a rename.
        if (patch.name && record.plan) {
          updateRecord(record.id, { plan: { ...record.plan, patientName: patch.name } });
        }
        audit('clinician', 'record.updated', {
          patientId: record.id,
          patientName: patch.name ?? record.name,
          detail: [patch.name && `renamed to ${patch.name}`, patch.details && `condition: ${patch.details}`]
            .filter(Boolean)
            .join(' · '),
        });
        return res.json(getState());
      }

      case 'deletePatient': {
        const { patientId } = body as Extract<StateAction, { action: 'deletePatient' }>;
        const record = requireRecord(res, patientId);
        if (!record) return;
        const state = getState();
        setState({
          records: state.records.filter((r) => r.id !== record.id),
          // Their flags leave the clinic inbox with them.
          inbox: state.inbox.filter((i) => i.patientId !== record.id),
        });
        audit('clinician', 'record.deleted', {
          patientId: record.id,
          patientName: record.name,
        });
        return res.json(getState());
      }

      case 'updatePatient': {
        const { patientId, name, details } = body as Extract<
          StateAction,
          { action: 'updatePatient' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        const patch: Partial<PatientRecord> = {};
        if (name?.trim()) patch.name = name.trim();
        if (details !== undefined) patch.details = details.trim() || undefined;
        updateRecord(record.id, patch);
        // Keep the plan's display name in step with a rename.
        if (patch.name && record.plan) {
          updateRecord(record.id, { plan: { ...record.plan, patientName: patch.name } });
        }
        return res.json(getState());
      }

      case 'deletePatient': {
        const { patientId } = body as Extract<StateAction, { action: 'deletePatient' }>;
        const record = requireRecord(res, patientId);
        if (!record) return;
        const state = getState();
        setState({
          records: state.records.filter((r) => r.id !== record.id),
          // Their flags leave the clinic inbox with them.
          inbox: state.inbox.filter((i) => i.patientId !== record.id),
        });
        return res.json(getState());
      }

      case 'extract': {
        // Real entry point: the clinician pastes the consult transcript or
        // their notes; the AI structures it into a draft plan for review.
        // The draft is never patient-visible — only sendPlan publishes it.
        const { patientId, transcript } = body as Extract<
          StateAction,
          { action: 'extract' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        if (!transcript?.trim()) {
          return res.status(400).json({ error: 'transcript is required' });
        }
        const draft = await extractPlan(transcript);
        updateRecord(record.id, {
          draftPlan: { ...draft, patientName: record.name },
          // Keep the source of truth with the record — the clinic can show it
          // after a refresh, and the plan stays traceable to its consult.
          transcript,
        });
        audit('clinician', 'consult.extracted', {
          patientId: record.id,
          patientName: record.name,
          detail: `${draft.medications.length} medications, ${draft.lifestyleActions.length} actions`,
        });
        return res.json(getState());
      }

      case 'sendPlan': {
        // Clinician approval gate — and, after a plan is live, the UPDATE
        // path: edits re-send against the published plan. Base = the reviewed
        // draft when one exists, else the already-sent plan. Screen edits
        // merge over the base; safety protocols and targets stay
        // server-authored.
        const { patientId, plan: edited } = body as Extract<
          StateAction,
          { action: 'sendPlan' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        const base = record.draftPlan ?? record.plan;
        if (!base) {
          return res
            .status(400)
            .json({ error: 'Nothing to send — extract a plan first' });
        }
        const isUpdate = record.planSent && !record.draftPlan;
        const plan: HandoffPlan = edited
          ? {
              ...base,
              ...edited,
              patientName: record.name,
              // Clinician-authored: an explicit edit from the clinic surface
              // may replace protocols/targets (that's who authors them); an
              // edit that omits them keeps the existing ones — the AI can
              // never write them either way.
              protocols: edited.protocols?.length ? edited.protocols : base.protocols,
              glucoseTarget: edited.glucoseTarget ?? base.glucoseTarget,
            }
          : base;
        updateRecord(record.id, {
          plan,
          draftPlan: null,
          planSent: true,
          // First send seeds the at-home rhythm; an update never resets the
          // patient's readings, tasks, or streak.
          ...(isUpdate
            ? {}
            : {
                planSentAt: new Date().toISOString(),
                glucoseReadings: seedGlucoseHistory(),
                explainer: null,
                streakDays: STREAK_DAYS,
                taskDate: today(),
                tasksDone: [],
              }),
        });
        addPatientMessage(record.id, {
          id: `pmsg-${Date.now()}`,
          kind: 'plan',
          title: isUpdate ? 'Your care plan was updated' : 'Your care plan has arrived',
          body: plan.summary,
          at: new Date().toISOString(),
        });
        const changes = isUpdate && record.plan ? diffPlans(record.plan, plan) : undefined;
        audit('clinician', isUpdate ? 'plan.updated' : 'plan.sent', {
          patientId: record.id,
          patientName: record.name,
          detail: isUpdate
            ? `${changes?.length ?? 0} change${changes?.length === 1 ? '' : 's'}`
            : plan.medications.map((m) => `${m.name} ${m.dose}`).join(' · '),
          changes,
        });
        return res.json(getState());
      }

      case 'checkIn': {
        const { patientId, checkIn } = body as Extract<
          StateAction,
          { action: 'checkIn' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        if (!checkIn?.symptom) {
          return res.status(400).json({ error: 'checkIn.symptom is required' });
        }
        const response = respondToCheckIn(checkIn, record.plan);
        updateRecord(record.id, { latestResponse: response });
        addPatientMessage(record.id, {
          id: `pmsg-${Date.now()}`,
          kind: 'check-in',
          title: `About your ${checkIn.symptom.toLowerCase()}`,
          body: response.message,
          steps: response.protocolSteps,
          escalated: response.escalate,
          at: new Date().toISOString(),
        });
        if (response.escalate) {
          addInboxItem({
            id: `inbox-${Date.now()}`,
            patientId: record.id,
            patientName: record.name,
            kind: 'check-in',
            checkIn,
            response,
            read: false,
          });
          audit('patient', 'checkin.flagged', {
            patientId: record.id,
            patientName: record.name,
            detail: `${checkIn.symptom} (${checkIn.severity})`,
          });
        }
        return res.json(getState());
      }

      case 'logGlucose': {
        const { patientId, value, context } = body as Extract<
          StateAction,
          { action: 'logGlucose' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        if (!Number.isFinite(Number(value))) {
          return res.status(400).json({ error: 'A numeric value is required' });
        }
        const target = record.plan?.glucoseTarget ?? { low: 4, high: 7 };
        const reading: GlucoseReading = {
          id: `glu-${Date.now()}`,
          value: Number(value),
          context: context === 'post-meal' ? 'post-meal' : 'fasting',
          loggedAt: new Date().toISOString(),
          flagged: isFlagged(Number(value), target),
        };
        const response = respondToGlucose(reading, target);
        updateRecord(record.id, {
          glucoseReadings: [...record.glucoseReadings, reading],
          latestResponse: response,
        });
        addPatientMessage(record.id, {
          id: `pmsg-${Date.now()}`,
          kind: 'glucose',
          title: `Your ${reading.value} mmol/L reading`,
          body: response.message,
          steps: response.protocolSteps,
          escalated: response.escalate,
          at: new Date().toISOString(),
        });
        if (response.escalate) {
          addInboxItem({
            id: `inbox-${Date.now()}`,
            patientId: record.id,
            patientName: record.name,
            kind: 'glucose',
            reading,
            response,
            read: false,
          });
          audit('patient', 'glucose.flagged', {
            patientId: record.id,
            patientName: record.name,
            detail: `${reading.value} mmol/L (${reading.context})`,
          });
        }
        return res.json(getState());
      }

      case 'toggleTask': {
        // Server-tracked daily rhythm: task completions and streak survive
        // refreshes and live on the record, not in the browser.
        const { patientId, taskId } = body as Extract<
          StateAction,
          { action: 'toggleTask' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        if (!taskId?.trim()) {
          return res.status(400).json({ error: 'taskId is required' });
        }
        const date = today();
        // New day → fresh checklist; completing anything today extends the
        // streak by one (once per day). Simple by design — production would
        // handle gaps/timezones properly.
        let tasksDone = record.taskDate === date ? [...record.tasksDone] : [];
        let streakDays = record.streakDays;
        const had = tasksDone.includes(taskId);
        if (had) {
          tasksDone = tasksDone.filter((t) => t !== taskId);
        } else {
          if (tasksDone.length === 0 && record.taskDate !== date) {
            streakDays += 1;
          }
          tasksDone.push(taskId);
        }
        updateRecord(record.id, { tasksDone, taskDate: date, streakDays });
        return res.json(getState());
      }

      case 'markRead': {
        const { id } = body as Extract<StateAction, { action: 'markRead' }>;
        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }
        return res.json(markInboxRead(id));
      }

      case 'patientOnboard': {
        const { patientId, profile } = body as Extract<
          StateAction,
          { action: 'patientOnboard' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        if (!profile?.name?.trim()) {
          return res.status(400).json({ error: 'profile.name is required' });
        }
        if (!profile.consentGiven) {
          // Consent is the basis for the entire data flow — no consent, no app.
          return res.status(400).json({ error: 'consent is required to continue' });
        }
        updateRecord(record.id, {
          profile: {
            name: profile.name.trim(),
            consentGiven: true,
            remindersEnabled: Boolean(profile.remindersEnabled),
            injectionDay: profile.injectionDay,
            onboardedAt: new Date().toISOString(),
          },
        });
        audit('patient', 'patient.onboarded', {
          patientId: record.id,
          patientName: record.name,
          detail: 'consent given',
        });
        return res.json(getState());
      }

      case 'explain': {
        const { patientId, concept } = body as Extract<
          StateAction,
          { action: 'explain' }
        >;
        const record = requireRecord(res, patientId);
        if (!record) return;
        // Cached per plan — one generation serves every open of the card.
        if (record.explainer) {
          return res.json(getState());
        }
        const explainer = await explainConcept(record.plan, concept);
        updateRecord(record.id, { explainer });
        return res.json(getState());
      }

      case 'reset': {
        return res.json(resetState());
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[state] action failed:', err);
    return res.status(500).json({ error: 'Action failed' });
  }
});
