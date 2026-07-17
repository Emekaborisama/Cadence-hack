# Cadence — Architecture & Build Workflow

**Stack:** Next.js (App Router) + TypeScript + Tailwind · one repo · one Railway service
**Companion docs:** [PRD.md](PRD.md) (what & why) · [JUDGE-QA.md](JUDGE-QA.md) (defense)
This doc is the technical contract. Phases come after — this is the map they're drawn on.

---

## 1. Governing principles (decide once, never re-litigate)

1. **Fixtures are the product; AI is the garnish.** Every screen must fully work with zero network. Live OpenAI calls are a toggle (`AI_MODE=fixture | live`), not a dependency. The demo runs on fixtures — period.
2. **The AI never authors medical content at runtime.** The coach *retrieves* from a clinician-approved protocol library and personalizes delivery. This is a code boundary, not a promise — medical answers come from data, not from a free-form model call. (This is the load-bearing safety claim; see [JUDGE-QA.md](JUDGE-QA.md) Q6.)
3. **One service, one URL.** Patient and clinician surfaces are routes in one Next.js app. No separate backend, no CORS, no second deploy.
4. **The schema is the first artifact.** All four surfaces (plan engine, coach, patient UI, RD queue) build against one shared type definition. Define it before building anything else, or the surfaces drift.
5. **Two surfaces, one store.** The magic is the patient's action appearing on the clinician's screen. That handoff is the demo — it must work live across two browser windows.

---

## 2. System at a glance

```
                    ┌─────────────────────────────────────────┐
                    │            Next.js (one service)          │
                    │                                           │
  ┌──────────┐      │   ROUTE /patient        ROUTE /clinic     │
  │ Browser  │◄────►│   (mobile frame)        (RD exception     │
  │ window 1 │ poll │   - onboarding           queue)           │
  │ PATIENT  │ ~1s  │   - daily plan          - flagged patients│
  └──────────┘      │   - coach chat          - AI snapshot     │
                    │   - logging + game      - resolve/act     │
  ┌──────────┐      │        │                     ▲            │
  │ Browser  │◄────►│        ▼                     │            │
  │ window 2 │ poll │   ┌─────────────────────────────────┐    │
  │ CLINIC   │ ~1s  │   │      Server state (in-memory)     │    │
  └──────────┘      │   │  patient · plan · logs · game ·   │    │
                    │   │  coach thread · escalations queue │    │
                    │   └─────────────────────────────────┘    │
                    │        │            ▲                      │
                    │        ▼            │                      │
                    │   ┌─────────────────────────────────┐    │
                    │   │        lib/ai.ts (interface)      │    │
                    │   │  generatePlan · coachRespond ·    │    │
                    │   │  reviewLogs                       │    │
                    │   │  AI_MODE=fixture → recorded JSON  │    │
                    │   │  AI_MODE=live    → OpenAI + schema │    │
                    │   └─────────────────────────────────┘    │
                    │              │ (live only)                 │
                    └──────────────┼─────────────────────────────┘
                                   ▼
                          OpenAI structured outputs
                                   +
                          Protocol library (clinician-authored JSON,
                          read in BOTH modes — never model-generated)
```

The single most important line in that diagram: the **protocol library is read in both fixture and live mode**. The AI never writes medical content — it selects from this library. That's the safety boundary made physical.

---

## 3. Surfaces (the two routes)

### `/patient` — mobile frame (the star)
The full patient experience inside a phone-shaped frame so it reads as a consumer app, not a dashboard.
- **Onboarding** → triggers plan generation → lands on the day-one plan.
- **Today** — the adaptive plan: protein/step/dose targets, next small action, med reminder.
- **Coach** — chat with the named AI coach; answers are visibly protocol-grounded (show the "from your care team's guidance" provenance).
- **Log** — one-tap injection log, meal snap, biomarker sync; each returns a reward + a lesson.
- **Progress** — streaks, non-scale victories, biomarker trends with plain-language read-out.

### `/clinic` — RD exception queue (the safety proof)
Thin but real. This is what makes "human on tap" and "one clinician, 10x panel" visible.
- A queue of flagged patients (most are AI-handled and never appear here — that's the point).
- Each item: AI-summarized patient snapshot + why it escalated + the triggering log/message.
- One action: acknowledge / respond → which flows back to the patient's coach thread.

---

## 4. The data model (THE CONTRACT — build this first)

One shared type file. Every surface imports from it. Shapes below are the spec, not final code.

- **`Patient`** — `id`, `name`, `condition`, `medication {name, currentDose, schedule, titrationPlan[]}`, `baselineLabs {a1c, lipids, weight}`, `goals`.
- **`CarePlan`** (output of the Plan Engine) — `patientId`, `weekNumber`, `proteinTargetG`, `stepTarget`, `calorieRange {min,max}`, `dailyActions[]`, `titrationTimeline[]`, `generatedAt`, `constraints {calorieFloor, proteinFloor, maxLossRatePerWeek}`. The constraints are hard rails validated **outside** the model (JUDGE-QA Q24).
- **`ProtocolCard`** (clinician-authored library — never model-generated) — `id`, `topic` (e.g. nausea, injection-site, missed-dose), `matchTriggers[]`, `patientFacingGuidance`, `escalates: bool`, `escalationThreshold`.
- **`LogEntry`** — `patientId`, `type` (injection | meal | symptom | biomarker), `payload`, `timestamp`, `reviewed: bool`, `aiFeedback`.
- **`GameState`** — `streaks {injection, logging}`, `points`, `level`, `activeQuests[]`, `nonScaleVictories[]`, `streakRepairUsed`.
- **`CoachMessage`** — `threadId`, `role` (patient | coach | rd), `text`, `sourceProtocolId?` (present when the answer came from a protocol — this is the provenance the UI shows), `timestamp`.
- **`Escalation`** — `patientId`, `reason`, `triggeredBy` (logId | messageId), `aiSnapshot`, `status` (open | acknowledged | resolved), `createdAt`. This is the RD queue's row type.

**Why this is first:** the fixture files, the AI live-mode schemas, the patient UI, and the RD queue are all just readers/writers of these types. Lock them and four people can build in parallel without colliding.

---

## 5. The AI layer (`lib/ai.ts`)

A single interface, three functions, two implementations behind one env flag.

| Function | Input | Output | Fixture mode | Live mode |
|---|---|---|---|---|
| `generatePlan` | intake + labs + dose schedule | `CarePlan` | returns recorded plan JSON | OpenAI structured output, validated against `CarePlan` schema + constraint rails |
| `coachRespond` | patient message + context | `CoachMessage` (+ `sourceProtocolId`) | returns scripted reply matched to a protocol | retrieval over protocol library → model personalizes delivery only |
| `reviewLogs` | log entries for a period | feedback + exceptions to escalate | returns recorded review | model summarizes; escalation thresholds checked in code |

Rules that make this safe and demo-proof:
- **`coachRespond` cannot return medical content that isn't traceable to a `ProtocolCard`.** In both modes it first matches to a protocol; if none matches → escalate. The model's only job in live mode is rephrasing approved guidance warmly.
- **Escalation thresholds are evaluated in plain code, never by the model.** The model can suggest; the threshold decides.
- **Constraint rails on `generatePlan` are validated after the call.** A plan violating `calorieFloor`/`proteinFloor`/`maxLossRate` is rejected and refetched, never shown.

---

## 6. State & realtime handoff

- **Store:** a module-level singleton in the Next.js server (a plain object keyed by `patientId`). Holds patient, plan, logs, game state, coach thread, escalation queue.
- **Realtime:** both routes **poll a status endpoint every ~1s** (simplest reliable option; SSE is a stretch upgrade). Patient logs a symptom → escalation lands in the store → clinician window's next poll renders it. That's the live cross-screen moment.
- **Known limit:** the in-memory store resets on server restart (Railway redeploys, crashes, free-tier sleep). Fine for a live demo (you won't redeploy mid-pitch). If rehearsal shows flakiness, swap in Railway's one-click Redis behind the same store interface — no surface code changes. Do **not** build Redis first; it's insurance, not a requirement.
- **Seed on boot:** the store initializes from fixture files so both screens have Meera's data the instant the app loads — no manual setup during the demo.

---

## 7. The four mechanics → where each one lives

| PRD mechanic | Lives in | Fixture artifact |
|---|---|---|
| 1 · Adaptive Plan Engine | `generatePlan` + `CarePlan` + Today screen | recorded week-1 plan JSON |
| 2 · Named AI Coach + human | `coachRespond` + protocol library + Coach screen + `/clinic` | protocol library JSON + scripted thread |
| 3 · Proactive Cadence Loop | store cadence events + escalation triggers | scripted check-in + one triggered escalation |
| 4 · Closed-Loop Review | `reviewLogs` + Progress screen + `reviewed` flag on logs | recorded "I reviewed your week" response |
| Gamification | `GameState` + Log/Progress screens | seed streaks + one quest + streak-repair example |

---

## 8. Demo flow → technical events (what fires when)

1. **Onboarding.** Patient submits mock intake → `generatePlan` → `CarePlan` written to store → Today screen renders the plan. *Proves activation.*
2. **Coach question.** Patient asks about nausea → `coachRespond` matches the nausea `ProtocolCard` → reply shows provenance ("from your care team's guidance") → plan adapts. *Proves protocol-grounded safety.*
3. **Log + streak.** Patient logs injection → `GameState` updates streak → `reviewLogs` returns same-day "I reviewed your week." *Proves the closed loop + game layer.*
4. **Escalation.** Patient reports a red-flag symptom → threshold check in code fires → `Escalation` written to store → **clinician window polls and the flagged patient appears** with AI snapshot. *Proves the safety model + the 10x-panel economics, on a second screen.*

Each step writes to the store; the cross-screen moment in step 4 is the pitch's peak.

---

## 9. Deployment (Railway)

- One service, Next.js auto-detected (`next build` / `next start`).
- **Bind to Railway's injected `PORT`** — never hardcode 3100 (that's local dev only).
- Env vars: `AI_MODE` (default `fixture`), `OPENAI_API_KEY` (only read in live mode).
- Redis add-on is a later toggle, not part of the first deploy.
- Deploy early and keep it green — a working URL from day one de-risks the whole weekend.

---

## 10. Proposed repo shape (for reference before phasing)

```
/app
  /patient          → patient route + screens
  /clinic           → RD exception queue
  /api              → status/poll + action endpoints
/lib
  ai.ts             → the three-function interface + mode switch
  store.ts          → in-memory singleton (+ future Redis adapter)
  schema.ts         → THE CONTRACT (section 4 types)
/fixtures
  patient.json      → Meera's seed
  plan.json         → recorded CarePlan
  protocols.json    → clinician-authored protocol library
  coach-thread.json → scripted coach replies
  review.json       → recorded closed-loop feedback
/components         → phone frame, cards, chat, queue rows, charts
```

---

## 11. What is real vs. staged (be able to say this precisely)

- **Real:** the schema, the store, the two-surface handoff, the AI interface, live-mode OpenAI structured outputs + protocol retrieval, the constraint rails, the escalation logic.
- **Staged/fixture:** the intake data (Meera), the transcript of labs, the protocol library content (clinician-authored in production — we wrote plausible cards), device syncs (typed by hand).
- **Not built (production path only):** real device integrations, EHR/pharmacy data feed, auth, live speech, notification infra. (JUDGE-QA Q25–26.)

---

## 12. Open decisions to lock before Phase 1

1. **Seed patient details** — Meera's exact medication (semaglutide starting dose + titration steps), baseline labs, and goals. Needed for every fixture. *Highest priority — everything hangs off this.*
2. **Protocol library scope** — which cards to author (nausea, injection-site reaction, missed dose, rapid-loss flag, low-mood red flag). ~5 covers the demo.
3. **Poll vs SSE** — start with 1s poll; only upgrade if it feels laggy on the projector.
4. **How many escalation types** the RD queue shows — one is enough for the demo; two looks more real.

Lock #1 and #2 tonight; they're the fixture contract. Then we phase the build.
