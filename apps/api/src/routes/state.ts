import { Router, type Request, type Response } from 'express';
import type {
  Escalation,
  GlucoseReading,
  HandoffPlan,
  LogEntry,
  StateAction,
} from '@cadence/shared';
import {
  CONSULT_TRANSCRIPT,
  isFlagged,
  respondToGlucose,
  seedGlucoseHistory,
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
  addGlucoseReading,
  addInboxItem,
  addLog,
  addPatientMessage,
  getState,
  markInboxRead,
  resetState,
  setGame,
  setPlan,
  setState,
  updateEscalation,
} from '../store.js';
import { env } from '../env.js';

export const stateRouter: Router = Router();

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

      case 'extract': {
        // Real entry point: the clinician pastes the consult transcript or
        // their notes; the AI structures it into a draft plan for review.
        // The draft is never patient-visible — only sendPlan publishes it.
        const { transcript } = body as Extract<StateAction, { action: 'extract' }>;
        if (!transcript?.trim()) {
          return res.status(400).json({ error: 'transcript is required' });
        }
        const draft = await extractPlan(transcript);
        setState({ draftPlan: draft });
        return res.json(getState());
      }

      case 'sendPlan': {
        // Clinician approval gate. Base = the reviewed draft when one exists
        // (no second AI call), else fresh extraction. Screen edits merge over
        // the base; safety protocols and targets stay server-authored.
        const { plan: edited, transcript } = body as Extract<
          StateAction,
          { action: 'sendPlan' }
        >;
        const state = getState();
        const base =
          state.draftPlan ?? (await extractPlan(transcript || CONSULT_TRANSCRIPT));
        const plan: HandoffPlan = edited
          ? {
              ...base,
              ...edited,
              // Authored server-side, never overwritten by the edit.
              protocols: base.protocols,
              glucoseTarget: base.glucoseTarget,
            }
          : base;
        setState({
          handoffPlan: plan,
          draftPlan: null,
          planSent: true,
          glucoseReadings: seedGlucoseHistory(),
          explainer: null, // new plan → regenerate the explainer on next open
        });
        addPatientMessage({
          id: `pmsg-${Date.now()}`,
          kind: 'plan',
          title: 'Your care plan has arrived',
          body: plan.summary,
          at: new Date().toISOString(),
        });
        return res.json(getState());
      }

      case 'checkIn': {
        const { checkIn } = body as Extract<StateAction, { action: 'checkIn' }>;
        if (!checkIn?.symptom) {
          return res.status(400).json({ error: 'checkIn.symptom is required' });
        }
        const state = getState();
        const response = respondToCheckIn(checkIn, state.handoffPlan);
        setState({ latestResponse: response });
        addPatientMessage({
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
            kind: 'check-in',
            checkIn,
            response,
            read: false,
          });
        }
        return res.json(getState());
      }

      case 'logGlucose': {
        const { value, context } = body as Extract<
          StateAction,
          { action: 'logGlucose' }
        >;
        if (!Number.isFinite(Number(value))) {
          return res.status(400).json({ error: 'A numeric value is required' });
        }
        const state = getState();
        const target = state.handoffPlan?.glucoseTarget ?? { low: 4, high: 7 };
        const reading: GlucoseReading = {
          id: `glu-${Date.now()}`,
          value: Number(value),
          context: context === 'post-meal' ? 'post-meal' : 'fasting',
          loggedAt: new Date().toISOString(),
          flagged: isFlagged(Number(value), target),
        };
        addGlucoseReading(reading);
        const response = respondToGlucose(reading, target);
        setState({ latestResponse: response });
        addPatientMessage({
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
            kind: 'glucose',
            reading,
            response,
            read: false,
          });
        }
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
        const { profile } = body as Extract<StateAction, { action: 'patientOnboard' }>;
        if (!profile?.name?.trim()) {
          return res.status(400).json({ error: 'profile.name is required' });
        }
        if (!profile.consentGiven) {
          // Consent is the basis for the entire data flow — no consent, no app.
          return res.status(400).json({ error: 'consent is required to continue' });
        }
        setState({
          patientProfile: {
            name: profile.name.trim(),
            consentGiven: true,
            remindersEnabled: Boolean(profile.remindersEnabled),
            injectionDay: profile.injectionDay,
            onboardedAt: new Date().toISOString(),
          },
        });
        return res.json(getState());
      }

      case 'explain': {
        const { concept } = body as Extract<StateAction, { action: 'explain' }>;
        const state = getState();
        // Cached per plan — one generation serves every open of the card.
        if (state.explainer) {
          return res.json(state);
        }
        const explainer = await explainConcept(state.handoffPlan, concept);
        setState({ explainer });
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
