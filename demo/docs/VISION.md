# Cadence
**eMed × OpenAI "Reimagine Health" Hackathon — 17–18 July 2026, London**
Product name: **Cadence** — trial-grade cardiometabolic support, delivered by AI. *(Cadence = consistency + structure; the drug is the tool, Cadence is what keeps people using it.)*

---

## One-liner

Patients forget 40–80% of what their clinician tells them the moment the call ends. We turn the consultation itself into their care plan: captured live, handed off visually, and kept alive at home between visits — with the daily rhythm that keeps them on the pathway.

## Design direction

**Soft-light-glass.** The patient companion is a premium, modern, frosted-glass surface: a pale mint→sky canvas, translucent white cards, high-contrast ink text (legible and trustworthy for a 52-year-old). The clinician side stays a clean, dense clinical tool. Pine-green is the shared accent; the clinician's voice is the recurring signature element.

## Next planned beat: A2UI (agent-generated UI)

The one hero innovation moment still to build: the companion's responses are composed by the agent as a **block list** (`videoGuide`, `chart`, `checklist`, `protocolSteps`, `statTile`, `text`) that the client renders — the AI decides the right *interface* for the moment, not just the right words. Demo beat: "how do I take my blood pressure?" → the agent composes a video-guide block on the fly. Scoped to a fixed block catalog so it stays demo-safe.

## The problem (with receipts)

- Patients forget **40–80% of medical information immediately** after a consultation, and nearly half of what they *do* retain is recalled **incorrectly** (Kessels, *J R Soc Med*, 2003).
- Adherence to long-term therapy for chronic conditions averages **~50%** (WHO), and comprehension/recall of instructions is a **direct driver** of adherence (Lam & Fresco, 2015).
- 50–75% of GLP-1 patients discontinue within 12 months, driven by side effects and cost, and most regain the weight and lose the cardiometabolic benefit.
- eMed's own thesis: at-home programs can reach **90% adherence** vs the 40–60% industry baseline. The gap between those numbers is comprehension, follow-through, and support between visits — exactly what dies at the consultation door today.

## The whitespace

Ambient AI scribes (Abridge, Nabla, Heidi, Nuance DAX, Tortus) capture the consult but stop at the **clinician's note** — Abridge's patient-facing output is a static text summary. Chronic-care companion apps (Noom Med, Oviva, Ro Body, Second Nature, Virta, Suvera) own the at-home experience but **start from a blank slate** the patient or a coach re-enters by hand.

**Nobody owns the handoff between the conversation and the home.** The scribe market went from <$200M (2022) to ~$5B+ (2026) entirely on the clinician side — the capture technology is validated; the patient side of it is empty.

## The patient

**Meera, 52, type 2 diabetes.** Remote chronic-condition review with her care team. Today her clinician adjusts her metformin, newly prescribes a GLP-1 (semaglutide, titration schedule), sets a home BP-monitoring routine, and gives her lifestyle instructions. That's ~14 discrete instructions in 20 minutes. By dinner, evidence says she reliably remembers three to five of them — some wrong.

*(Deliberate framing: this is a **chronic condition review**, not a diagnosis. The AI never diagnoses — it captures, structures, and hands off. The clinician stays the decision-maker. This keeps us squarely in the brief's "at-home chronic condition management" and out of the "don't drift into acute clinical care" trap.)*

## The product — two connected surfaces

### Patient side (mobile) — the star, three focused screens
The phone opens on **Today**, not a static plan. Bottom nav: Today / Plan / Progress.

1. **Today (the retention home).** A letter-style handoff greeting, a **streak** with a daily-progress row, a scheduled **Week 2 check-in nudge** ("You're two weeks into semaglutide. How are you feeling?"), and a **today's-plan checklist** derived from the plan (meds AM/PM, injection, glucose, walk) with reminder times and tap-to-complete. This screen is the answer to "why does she open the app on day 12?"
2. **Plan (the reference).** The full handoff: medication cards (what / dose / when / **why, in her clinician's own words**), the titration timeline with a "Start here" marker, everyday actions, "when to get help", the follow-up with add-to-calendar.
3. **Progress (at-home monitoring).** A **glucose trend** — a bar chart moving out-of-range → into the clinician-set target band — with a **plain-language read-out** ("trending down, closing in on your 4–7 target") and "% in range." **Log a reading**: in-range confirms; a high or low reading returns the clinician's protocol and **flags the care team**.
4. **The closed loop.** Whether the trigger is a symptom check-in or a flagged glucose reading, the companion serves the **clinician-authored** response and escalates to the care team at the clinician's threshold — support arrives at the exact moment patients normally quit silently.

### Clinician side (desktop) — thin but real
1. **Live consult view.** Transcript streams in; a structured plan (medications, decisions, actions, red flags, glucose target, safety protocols) assembles itself in the sidebar in real time as extraction events fire.
2. **Review, edit, approve.** The clinician can **edit any dose** (an "edited" badge marks it, and the edit genuinely flows to the patient), sees the **safety protocols that will be attached**, and approves via **"Approve & send to patient"** — "Nothing reaches the patient until you approve it here."
3. **Between-visit inbox.** Meera's flagged check-ins and glucose readings surface here with context, closing the loop without a phone call.

## The safety model (our answer to every hard question)

The AI **never writes medical advice at runtime.** The clinician authors **protocol cards** (nausea, hypo) that are attached to the plan at send time. When Meera reports a symptom, the app **matches her report to the right card and hands over its exact steps**, then decides whether the clinician's threshold is crossed. Glucose uses the same path against a clinician-set target. *The doctor packs the kit; the app hands over the right pouch.* In the code this is deliberate: the escalation decision lives in pure, deterministic functions, not in the model — which is both the reliable-demo choice and the literal safety story.

## Why this couldn't exist two years ago

Reliable real-time speech-to-*structured-clinical-data* — extracting a typed, safety-checked plan (drug, titration schedule, red-flag side effects, lifestyle actions) from a messy remote consult rather than a rough transcript — only became dependable with the current generation of models. The same models now also *generate* the tailored patient-facing visual companion in one pass. One AI pass that both understands the clinician and speaks to the patient didn't exist at usable accuracy in 2024.

## Feasibility (the judges' third question)

- **Data in:** consult audio (with consent) — the same rails every deployed ambient scribe already uses in UK clinics (Heidi and Nabla are live in the NHS).
- **Data out:** NHS login + GP Connect–style integration is the production path; for the pilot, the plan lives in the companion app only.
- **Safety:** clinician edits and approves the extracted plan before it's sent; the companion only ever serves clinician-authored protocol cards; anything past the clinician's threshold escalates to the care team. AI matches and routes, humans author and decide.
- **Economics:** sold where eMed sits — programs paid on adherence outcomes. Comprehension → adherence is the most defensible ROI line in the space.

## What we are deliberately NOT building (hackathon guardrails)

Real speech-to-text on stage, real NHS API calls, auth, wearable/CGM device integrations, drug-database lookups, push-notification infrastructure. Each gets one line in the pitch as "the production path." The demo simulates the transcript stream word-by-word from a scripted consult — looks live, never breaks.

## Build status (what actually runs)

- **Stack:** Next.js (App Router, webpack dev), Tailwind, one in-memory shared store polled at 1s. Two routes: `/clinic` and `/patient`. Runs at `localhost:3100`.
- **AI layer** behind `lib/ai.ts`: fixture-backed today, upgrades to OpenAI (`gpt-4o`, structured JSON) automatically when `OPENAI_API_KEY` is set — the demo path is identical either way.
- **Verified end-to-end:** clinician dose-edit flows to the patient plan; symptom check-in sources steps from the protocol card and escalates; glucose logging updates the trend and flags the inbox; both surfaces stay in sync across two windows.
- **Design:** warm-paper / pine-green / editorial-serif system, deliberately off the clinical-blue default; the clinician's voice is the recurring signature element.

---

# Pitch narrative (3 minutes)

**Hook (20s).** "Meera left her diabetes review with a new prescription and fourteen instructions. Research says that by dinner she'll remember five — and get two of those wrong. This isn't a memory problem. It's a handoff problem. Medicine spends the whole consultation generating a plan, then hands it to the patient as… a memory."

**Insight (20s).** "AI scribes already capture the consultation — a $5 billion market — but everything they produce is for the *clinician*. The patient walks away with nothing. And the apps patients use at home start from a blank page. Nobody connects the conversation to the home. So we did."

**Demo (~100s).** Two windows side by side, clinician left / phone right.
1. **Capture.** Clinician screen: consult streaming, plan assembling itself in the sidebar — meds, titration, protocols. "Nothing here is typed. The AI is listening the way a resident would."
2. **The safety beat.** Clinician taps **Edit**, corrects a dose (an "edited" badge appears), and points to the two attached safety protocols. "The doctor packs the kit. The AI never writes advice." Then **Approve & send**.
3. **The handoff.** Phone lights up on **Today**: the greeting, the plan checklist, reminders. Flip to **Plan** — med cards with the clinician's own reasoning, and the dose we just corrected. "Fourteen instructions, zero reliance on memory."
4. **Retention (the day-12 answer).** "Two weeks later." Tap the **Week 2 check-in** nudge → Meera logs nausea at the exact moment 50–75% of GLP-1 patients quit. Companion returns her clinician's protocol; the clinician inbox pings. "Support in the minute she'd have silently stopped."
5. **Monitoring (optional if time).** **Progress** tab: her glucose trend dropping into range in plain language; log a high reading → it flags the care team. "At-home numbers, turned into a next action."

**Why now / why us (20s).** One model pass that both understands the clinician and speaks to the patient only became possible this year. Team: design leadership on live product used by [Akeneo] customers, engineering across agents and health-adjacent platforms, and a founding team member building an ed-platform for doctors with a physician co-founder.

**Close (10s).** "The consultation used to end at the door. Now it doesn't end at all."

*Tight-time cut: Capture → Safety beat → Handoff → Week 2 check-in. Mention Progress and monitoring in one line rather than clicking through, to protect the 3-minute limit.*

---

## Team alignment Q&A (from the Jul 17 evening brainstorm)

**"How is this different from AI note-taking / transcription?"**
Scribes produce a document *for the clinician*. We transform the conversation into an *actionable journey for the patient* — schedule, reminders, visuals, check-ins, escalation. Notes are the input; the handoff and the at-home loop are the product. (All five major scribes — Abridge, Nabla, Heidi, DAX, Tortus — stop at a note or a text summary. Verified.)

**"Doesn't the doctor already have it written down before they say it?"**
The clinician's record is written for the EHR, in clinical language, and the patient never usably receives it. What the patient gets today (Lola's own telehealth experience): an SMS with a prescription summary and a payment link — **and no instructions for how to actually take the drug.** The gap isn't capture; it's translation and delivery. That lived anecdote goes in the pitch.

**"What's the entry point? Who generates the URL?"**
Deliberately out of scope. The story starts *inside* an in-progress remote consultation (the rails Babylon/Livi/telehealth already run). We demo from mid-consult onward because the handoff is the innovation, not meeting administration.

**"What about the 70-year-old who isn't tech-savvy?"**
Two answers: (1) the plan is visual and voice-readable, designed to be *less* demanding than reading a clinical letter; (2) our named ICP is telehealth users with a chronic condition — they've already self-selected as digital. Narrow is good; judges penalize "built for the internet user."

**"How do we keep the patient consistent, not just informed?" (Boye's gamification thread)**
This is the day-12 problem, and it is now **built** as the Today tab's **consistency loop**: a streak with daily-progress, a today's-plan checklist with reminder times, and a scheduled Week 2 check-in nudge, all feeding clinician escalation when something's wrong. Pitch line: reward consistency where it aligns with the payer. Adherence is literally eMed's business model, so consistent patients are the ROI. Duolingo-style hard gamification, drug discounts, and Apple Health auto-detection are named as roadmap, not built.

**"What exactly does the AI extract, and can the clinician change it?"**
Typed entities the clinician reviews and approves before send: medications (name/dose/schedule/why), titration steps, lifestyle actions, red-flag symptoms, glucose target, appointments, and the attached safety protocols. The clinician can **edit doses inline** (verified to flow through to the patient), and nothing is sent until they approve. The approval gate is the safety story.

**Target user, one sentence:** an existing telehealth patient with a diagnosed chronic condition (T2D), on a remote review, newly prescribed or adjusting therapy — not a new-diagnosis, not acute care.

## Demo-day risk register

| Risk | Mitigation |
|---|---|
| Venue wifi / API outage | Fixture mode: every AI call has a recorded response behind an env flag; demo path is identical |
| Live STT fails on stage | We never use live STT; scripted transcript replayed word-by-word |
| Two-screen sync breaks | Shared server store polled at 1s; fallback single-screen split view |
| "Isn't this just a scribe?" | Whitespace table plus "scribes stop at the note; apps start from scratch; we own the handoff" |
| "What about hallucinated doses?" | Clinician edits and approves before send; companion serves only clinician-authored protocol cards; escalation logic is deterministic, not model-generated |
| Three patient tabs stretch the 3-min demo | Tight-time cut in the demo narrative: Capture → Safety beat → Handoff → Week 2 check-in; Progress mentioned, not clicked |
| Demo state resets on code recompile (dev) | Known dev-mode behaviour; re-send the plan from `/clinic` if it clears mid-rehearsal |
