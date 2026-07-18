# Cadence — Delivery Plan

The six-step path, mapped onto what already exists in this repo. Rule of the plan: **we formalize forward, we don't rebuild backward** — existing artifacts get specs written *around* them, not thrown away.

**Ground rules**
- `/demo` is the UI reference. **Read-only. No changes, ever.** Frontend work happens in `apps/web`, using `/demo` as the design source of truth.
- `packages/shared` is the contract. Any shape change lands there first, then API, then web.
- `AI_MODE=fixture` stays the default; the demo must run with zero network.

---

## Step 1 — Functional requirements  →  `FRD.md`

**Status: DONE (this commit).** Numbered FRs (FR-x.y) derived from the PRD's MVP section and the README demo choreography. Every later artifact traces back to an FR number — backend endpoints, screens, and test cases all cite them.

## Step 2 — Backend spec (off FRD)  →  `openapi.yaml`

**Status: partially pre-built — needs formalizing.** `apps/api` already implements the demo loop (`POST /api/state` actions: `onboard | coach | log | resolve | reset`, plus `GET /api/state`, `GET /health`, `POST /api/chat`). The work here is to write the OpenAPI 3.1 spec that *describes the API we want*, using the FRD:
- Document existing endpoints with full request/response schemas referencing `packages/shared` types.
- Decide the open design question: keep the single `POST /api/state` action envelope (fast, matches store model) vs. RESTful resources (`POST /api/logs`, `POST /api/escalations/:id/resolve`). **Recommendation: keep the action envelope for the hackathon** — one endpoint, one reducer, trivially demoable; note REST as production path.
- Spec the gaps found against the FRD (weekly review response, game-state deltas in responses, streak repair).

**Definition of done:** `openapi.yaml` at repo root; every FR marked `API: covered | gap`.

## Step 3 — Implement backend (off spec)

**Status: ~70% pre-built.** Close the FR gaps in `apps/api`, keeping fixtures first:
- Any new action gets a fixture path before a live path.
- Escalation thresholds stay in plain code (never model-decided) — this is the safety architecture, don't erode it.
- Add spec conformance: responses validated against shared types in `pnpm typecheck`; a smoke script that walks the full demo choreography (onboard → coach → log → escalate → resolve) and asserts state transitions.

**Definition of done:** smoke script green in fixture mode; `openapi.yaml` and implementation agree; live mode degrades gracefully to fixtures on any API error.

## Step 4 — Product design

**Status: DONE in spirit — `/demo` is the design.** It's a working Next.js UI (phone frame, Today/Progress tabs, titration timeline, clinic view, inbox). The remaining design work is a **mapping exercise, not a design exercise**:
- Inventory `/demo` components → mark each as *adopt / adapt / skip* for `apps/web`.
- Flag legacy components from the earlier consult-handoff concept (e.g. `TranscriptStream`, `PlanSidebar`) that don't belong in the Cadence flow — skip, don't port.
- Output: a one-page `apps/web/DESIGN-MAP.md` listing target screens → source `/demo` components → FR numbers.

## Step 5 — Frontend dev (off design)

**Status: scaffold exists (`apps/web`, Vite + React + HeroUI + Tailwind v4).** Build the patient PWA + clinic view against **mocked responses that match `openapi.yaml`** — not against the live API — so this step parallelizes with step 3. Screen priority = demo choreography order:
1. Patient onboarding → plan (FR-1.x)
2. Coach thread with protocol provenance (FR-2.x)
3. Log + streak moment (FR-3.x)
4. Clinic escalation queue + resolve (FR-4.x)
5. Progress/review (FR-5.x) — last; it's shown, not driven, in the demo.

## Step 6 — Integration (via the OpenAPI layer)

**Status: not started.** Swap mocks for a typed client:
- Generate the client from `openapi.yaml` (or hand-write one thin `lib/api.ts` typed by `packages/shared` — acceptable at this scale; the spec still governs).
- 1s polling of `GET /api/state` drives both surfaces; the cross-screen escalation moment is the integration test.
- Final gate: **full demo choreography, two browser windows, wifi off** (fixture mode), then once more with `AI_MODE=live`.

---

## Sequencing & parallelism

```
Step 1 FRD ──► Step 2 openapi.yaml ──► Step 3 backend gaps ──┐
                        │                                      ├──► Step 6 integrate ──► rehearse
                        └──► Step 5 frontend (mocked) ◄── Step 4 design map ──┘
```

Steps 3 and 5 run in parallel once the spec exists — that's the entire point of the OpenAPI layer. Step 4 is an hour of inventory, not a phase.

## Demo-day gate (unchanged from README)

1. `/patient` → Generate my week-one plan
2. Coach: "I have nausea since the injection" → protocol provenance visible
3. Log moderate nausea → escalate
4. `/clinic` → flagged patient (~1s poll) → Resolve → message patient
5. Patient coach thread shows the RD reply
