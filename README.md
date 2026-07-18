# Cadence

**Trial-grade cardiometabolic support, delivered by AI.** Clips onto a GLP-1 prescription and delivers the four trial ingredients — personalized plan, named coach, adaptive cadence, reviewed logs — with humans only at judgment moments.

eMed × OpenAI "Reimagine Health" hackathon · Jul 2026

## Stack (monorepo)

Tofunmi’s scaffold, productized:

```
apps/
  web/       Vite + React + TS PWA · HeroUI · Tailwind v4
  api/       Node + Express + TS · OpenAI (optional) · in-memory store
packages/
  shared/    Shared domain types (the contract)
```

`AI_MODE=fixture` is the default — the demo runs with zero wifi. Flip to `live` for OpenAI structured outputs (protocol retrieval still grounds medical answers).

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # AI_MODE=fixture needs no key
pnpm dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001 (`GET /health`, `GET/POST /api/state`)

## Demo choreography (two windows) — the design flow

Matches the design-complete prototype in `demo-ui/` (read-only reference).

1. `/clinic` → **Start consult** — the transcript streams word-by-word; the care
   plan assembles itself in the sidebar (medications, titration, monitoring,
   red flags, protocols). Optionally **Edit** a dose.
2. **Approve & send to patient** → within ~1s the `/patient` phone swaps from
   its waiting state to the visual plan (medication cards with the clinician's
   own "why", titration timeline, everyday actions, red flags, follow-up).
3. Patient: **Check in with my care team** → the pre-filled "Nausea / moderate"
   check-in → the clinician's protocol comes back, and the `/clinic` inbox
   lights up with the flag — the closed loop.
4. Patient Progress tab: **Log a reading** → an in-range reading is quietly
   logged; **11.9** crosses the clinician's 4–7 target and flags the inbox.

Reset from the clinic header anytime. (The earlier adherence-coach flow —
onboard / coach chat / streak logging / RD queue — is still served by the same
API and covered by the smoke test.)

## API actions

`POST /api/state`

| action | body |
|---|---|
| `onboard` | — |
| `coach` | `{ text }` |
| `log` | `{ type, payload?, severity? }` |
| `resolve` | `{ escalationId, note? }` |
| `reset` | — |

## Quality

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm smoke      # walks the full demo choreography against a running API (42 FR checks)
```

Contract: [`openapi.yaml`](openapi.yaml) · Requirements: [`FRD.md`](FRD.md) · Plan: [`DELIVERY.md`](DELIVERY.md) · UI porting guide: [`apps/web/DESIGN-MAP.md`](apps/web/DESIGN-MAP.md)
