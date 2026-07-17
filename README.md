# Cadence

**Trial-grade cardiometabolic support, delivered by AI.** The support layer that clips onto a GLP-1 prescription and delivers the four things clinical trials do — build the plan, give you a coach, check in on a rhythm, and review your data — so people stay on the pathway.

eMed × OpenAI "Reimagine Health" hackathon · Jul 2026

## Repo layout
- `demo/` — the working prototype (Next.js + Tailwind). Consult→home handoff, retention loop, glucose monitoring, clinician edit/approve + inbox. Runs at `localhost:3100`.
  - Full concept + build status: `demo/docs/VISION.md`
  - Inspiration board: `demo/inspiration/inspiration-board.html`

## Run the demo
```bash
cd demo && pnpm install && pnpm dev   # http://localhost:3100
```
Two windows: `/clinic` (clinician) and `/patient` (mobile). Reset + choreography in `demo/README.md`.

## Direction (in progress)
Rebuild toward a white, premium, monogram.ai-style visual language on **HeroUI** + **Tremor**, visual-first (show the real object, not text).
