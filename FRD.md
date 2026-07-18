# Cadence — Functional Requirements (FRD)

Step 1 of the delivery path. Every backend endpoint, screen, and test traces to an FR number. Scope = hackathon MVP (the demo choreography), not production.

**Priority:** P0 = demo breaks without it · P1 = strengthens demo · P2 = show-if-asked.
**Trace targets:** `openapi.yaml` (step 2), `apps/web/DESIGN-MAP.md` (step 4).

---

## Epic 1 — Activation: onboarding → instant plan

- **FR-1.1 (P0)** The system holds a seeded patient (Meera: T2D, semaglutide with titration plan, baseline A1c/lipids/weight, goals) available on boot with no manual setup. *Fixture: `patient.ts`.*
- **FR-1.2 (P0)** A patient can trigger plan generation (`onboard`); the system returns a `CarePlan` with protein target, step target, calorie range, daily actions, titration timeline, and plain-language summary.
- **FR-1.3 (P0)** Every generated plan is validated in code against hard constraints (`calorieFloor`, `proteinFloor`, `maxLossRatePerWeekKg`). A violating plan is rejected and regenerated — never shown. *The model fills rails; it cannot move them.*
- **FR-1.4 (P1)** The plan renders within ~2s of the tap (fixture mode is instant; live mode shows a generating state).

## Epic 2 — Coach: protocol-grounded answers

- **FR-2.1 (P0)** A patient can send a free-text message to the named coach and receive a reply in a persistent thread.
- **FR-2.2 (P0)** Medical replies (side effects, dosing, symptoms) must carry `sourceProtocolId` referencing a clinician-authored `ProtocolCard`. **The model never authors medical content** — in live mode it only rephrases the matched card's guidance.
- **FR-2.3 (P0)** The UI shows provenance on protocol-grounded replies ("from your care team's guidance").
- **FR-2.4 (P0)** A message matching no protocol card must not be answered with generated medical advice — the coach acknowledges and escalates (FR-4.1). *Failure mode is "ask a human," never "guess."*
- **FR-2.5 (P1)** Non-medical coaching (diet ideas, motivation) may be generative in live mode; in fixture mode it's scripted.

## Epic 3 — Logging & game layer

- **FR-3.1 (P0)** A patient can log: injection (one tap), symptom (type + severity), meal, biomarker. Each becomes a `LogEntry`.
- **FR-3.2 (P0)** Each log returns immediate feedback: a game-state delta (streak/points/quest progress) and a short lesson or acknowledgment. *Every input returns a reward and a lesson.*
- **FR-3.3 (P0)** Injection and logging streaks increment on consecutive activity.
- **FR-3.4 (P1)** Streak repair: honestly logging a missed dose preserves the streak (flagged `streakRepairUsed`) and generates an adherence signal — never a punishment.
- **FR-3.5 (P2)** Quests reflect the day's plan (protein quest progress from meal logs).
- **FR-3.6 (P0 — exclusion)** No mechanic may reward weight change or restriction: no weight leaderboards, no rewards for eating less. *This is a requirement, not a style choice.*

## Epic 4 — Escalation & clinic surface (the closed-loop peak)

- **FR-4.1 (P0)** A symptom log at/above a protocol's `escalationThreshold` — or an unmatched coach message — creates an `Escalation` with an AI snapshot (fixture: prewritten) and reason. **Threshold evaluation happens in plain code, never in the model.**
- **FR-4.2 (P0)** The clinic view lists open escalations, newest first, showing patient, reason, trigger, and snapshot.
- **FR-4.3 (P0)** Escalations appear on the clinic surface within ~1s of creation (polling), with no manual refresh — this is the live cross-screen demo moment.
- **FR-4.4 (P0)** A clinician can resolve an escalation with a note; the note is delivered into the patient's coach thread as an `rd`-role message.
- **FR-4.5 (P1)** Sub-threshold symptoms do *not* escalate — the coach handles them with the matched protocol. The queue showing only exceptions is the "10x panel" proof.

## Epic 5 — Closed-loop review & progress

- **FR-5.1 (P1)** The patient can see a "your week, reviewed" response summarizing logged data with plain-language feedback; every `LogEntry` it covers is marked `reviewed: true`. *No entry goes unread.*
- **FR-5.2 (P1)** A progress surface shows streaks, points/level, non-scale victories, and biomarker trend with a plain-language read-out.

## Epic 6 — System & demo operability

- **FR-6.1 (P0)** `AI_MODE=fixture` (default) serves the entire choreography with zero network. `AI_MODE=live` uses OpenAI structured outputs; **any live-mode failure falls back to fixtures silently** — the demo never errors on stage.
- **FR-6.2 (P0)** Full app state is readable in one call (`GET /api/state`) — both surfaces render from this single poll.
- **FR-6.3 (P0)** All state mutations go through one action endpoint (`POST /api/state`: `onboard | coach | log | resolve | reset`).
- **FR-6.4 (P0)** `reset` restores seeded state instantly from any point — rehearsal and recovery depend on it.
- **FR-6.5 (P1)** Live-mode plan/coach outputs are schema-validated (shared types) before entering the store; invalid outputs are dropped in favor of fixtures.
- **FR-6.6 (P2)** State survives within a server process; persistence across restarts is out of scope (in-memory store is accepted).

## Out of scope (named, so nobody builds them)

Auth, real device/EHR/pharmacy integrations, push notifications, live speech, multi-patient clinic rosters beyond the seeded patient, persistence beyond process memory.

---

## Traceability — demo choreography → FRs

1. Generate week-one plan → FR-1.1–1.4
2. Nausea question with provenance → FR-2.1–2.3
3. Log moderate nausea → escalate → FR-3.1–3.2, FR-4.1
4. Clinic flag appears → resolve → FR-4.2–4.4
5. RD reply in patient thread → FR-4.4, FR-2.1
   (Throughout: FR-6.1–6.4. Shown if asked: FR-3.4, FR-4.5, FR-5.x.)
