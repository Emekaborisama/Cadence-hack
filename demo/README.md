# Cadence — Consult-to-Home Handoff Copilot

Hackathon prototype (eMed × OpenAI "Reimagine Health"). A clinician sees a live
consult transcript with an AI-extracted care plan assembling in a sidebar,
approves and sends it, and the patient's phone receives a visual, actionable
plan. The patient later logs a side effect, and it surfaces in the clinician's
between-visit inbox — the closed loop.

> The AI never diagnoses. It captures and structures what the clinician said,
> and only ever serves clinician-approved protocols.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3100
```

The dev server runs on **port 3100** (`next dev -p 3100`). If 3100 is taken,
change the `dev` script in `package.json`.

Open two browser windows:

- `http://localhost:3100/clinic` — desktop clinician view
- `http://localhost:3100/patient` — mobile patient view (phone frame)

`http://localhost:3100/` is a launcher linking to both.

## Demo choreography (the 3 beats)

1. **Reset.** On `/clinic`, click **Reset demo** for a clean run.
2. **Consult.** Click **Start consult** — the transcript streams word-by-word and
   the care plan assembles itself in the sidebar as extraction events fire
   (medications, titration schedule, monitoring, red flags, follow-up).
3. **Handoff.** Click **Send plan to patient**. Within ~1s the `/patient` window
   swaps from its waiting state to the full visual plan (medication cards with
   the clinician's own "why", titration timeline, everyday actions, red flags,
   next appointment).
4. **Closed loop.** On `/patient`, tap **Log how I'm feeling** → the pre-filled
   "Nausea / moderate" check-in → **Log check-in**. The patient sees the
   clinician-approved protocol; because it escalates, the `/clinic` inbox lights
   up with the flag (poll interval ~1s).

## How it works

- **Shared state**: a module-level in-memory store (`lib/store.ts`, persisted on
  `globalThis` across dev hot-reloads). No DB, no websockets. Both views poll
  `GET /api/state` every second.
- **API** (`app/api/state/route.ts`, `app/api/reset/route.ts`):
  - `GET /api/state` — full shared state.
  - `POST /api/state` — action dispatcher: `sendPlan`, `checkIn`, `markRead`.
  - `POST /api/reset` (also `GET`) — clears state for a re-run.
- **Live stream**: the scripted transcript replays word-by-word on the client;
  timed `EXTRACTION_EVENTS` merge patches into the sidebar plan. Looks live,
  never breaks — no real STT.

## Fixture mode vs OpenAI mode

The AI layer lives in `lib/ai.ts` with two functions:

- `extractPlan(transcript)` → `CarePlan`
- `respondToCheckIn(checkIn, plan)` → `CheckInResponse`

If `OPENAI_API_KEY` is set, both call OpenAI (`gpt-4o`, JSON output). Otherwise
they return fixtures from `lib/fixtures.ts`. **The demo works fully in fixture
mode** — this is the on-stage path. To try live extraction:

```bash
OPENAI_API_KEY=sk-... pnpm dev
```

Any OpenAI error falls back to the fixture, so the demo never hard-fails.

## Project structure

```
app/
  page.tsx                  launcher
  clinic/page.tsx           clinician view (stream + plan + inbox)
  patient/page.tsx          patient mobile view (phone frame)
  api/state/route.ts        GET/POST shared state
  api/reset/route.ts        reset endpoint
components/
  PhoneFrame, TranscriptStream, PlanSidebar, MedicationCard,
  TitrationTimeline, CheckInSheet, InboxPanel
lib/
  types.ts                  shared domain types
  fixtures.ts               scripted transcript, CarePlan, timed events, check-in
  ai.ts                     extractPlan / respondToCheckIn (fixture or OpenAI)
  store.ts                  in-memory shared state
```

## Not in scope (guardrails)

No auth, DB, websockets, real speech-to-text, drug-database lookups, or push
infrastructure. Each is "the production path" in the pitch. Tomorrow is the
design pass — styling here is intentionally neutral.
