# Cadence

**Trial-grade cardiometabolic support, delivered by AI.** The support layer that clips onto a GLP-1 prescription and delivers the four things clinical trials do — build the plan, give you a coach, check in on a rhythm, and review your data — so people stay on the pathway.

eMed × OpenAI "Reimagine Health" hackathon · Jul 2026

## Repo layout

- `demo/` — the working prototype (Next.js + Tailwind). Consult→home handoff, retention loop, glucose monitoring, clinician edit/approve + inbox. Runs at `localhost:3100`.
  - Full concept + build status: `demo/docs/VISION.md`
  - Inspiration board: `demo/inspiration/inspiration-board.html`
- `apps/` + `packages/` — the production monorepo (the rebuild, see below).

## Run the demo

```bash
cd demo && pnpm install && pnpm dev   # http://localhost:3100
```

Two windows: `/clinic` (clinician) and `/patient` (mobile). Reset + choreography in `demo/README.md`.

## Direction (in progress)

Rebuild toward a white, premium, monogram.ai-style visual language on **HeroUI** + **Tremor**, visual-first (show the real object, not text).

---

## Monorepo (the rebuild)

A TypeScript monorepo (pnpm workspaces + Turborepo): a **PWA frontend** (Vite + React + [HeroUI](https://heroui.com/)) and a **Node backend** (Express) whose LLM layer is powered by **OpenAI**.

```
apps/
  web/       Vite + React + TS PWA, UI via HeroUI (Tailwind v4 + framer-motion)
  api/       Node + Express + TS, OpenAI SDK as the LLM layer
packages/
  shared/    Shared TS types (the chat contract used by both apps)
```

### Prerequisites

- Node >= 20 (see `.nvmrc`)
- pnpm (`corepack enable` or `npm i -g pnpm`)
- An OpenAI API key

### Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then add your OPENAI_API_KEY
```

### Develop

```bash
pnpm dev
```

Runs both apps via Turborepo:

- Web: http://localhost:5173 (Vite proxies `/api` → the Node server)
- API: http://localhost:3001 (`GET /health`, `POST /api/chat`)

### Quality gates

Intentionally relaxed for fast iteration:

```bash
pnpm typecheck     # tsc across all packages
pnpm lint          # eslint (flat config, warnings-biased)
pnpm format        # prettier --write
pnpm build         # production build of every app
```

### API

`POST /api/chat`

```json
{ "messages": [{ "role": "user", "content": "Hello" }] }
```

Returns `{ "message": { "role": "assistant", "content": "..." }, "model": "gpt-4o-mini" }`.
