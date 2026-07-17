# PRD: Cadence

**The AI support layer that keeps people on the cardiometabolic pathway**
Obesity · Type 2 Diabetes · Cardiovascular Disease
eMed × OpenAI "Reimagine Health" Hackathon · Working name · July 2026 · Final for build

---

## One-liner

Cadence clips onto any GLP-1 prescription and delivers the four things clinical trials always provide — a personalized plan, a named coach, a check-in rhythm, and reviewed data — with AI doing the constant work and humans handling the moments that need judgment. The drug is the tool; Cadence is what makes people keep using it.

**North Star: 12-month therapy persistence.** We optimize for people who stay on the pathway and sustain results — never app taps, never short-term weight loss.

---

## The problem

Access to medication is solved — telehealth did that. What prescribe-and-ship stripped out is the wraparound support that made the trials succeed. Two documented failures follow:

- **Activation failure (days 1–14).** Patients receive the drug but no plan — no roadmap for diet, activity, dosing, or getting started. A 2026 JMIR analysis names this "the clinical support gap after the prescription," citing patients who got a 3-minute call at initiation and built their own plans from Facebook groups.
- **Retention failure (month 2 onward).** Real-world GLP-1 persistence is 32–50% at one year, versus 80–93% in trials. Side effects are the top quantified reason for stopping (28% of discontinuations); cost, needle anxiety, schedule disruption, and treatment fatigue drive the rest.

These are one arc, not two problems: the missing connective tissue that turns a delivered prescription into a followed plan. Patients who quit regain the weight and lose the cardiometabolic benefit — and the payer loses the entire spend.

---

## The insight: trials never test the drug alone

STEP (semaglutide) and SURMOUNT (tirzepatide) delivered 15–20% weight loss with high adherence — always on top of a structured support program with four ingredients that real-world telehealth removes:

1. **A personalized diet & activity prescription** — a specific plan (~500 kcal/day deficit, ~150 min/week activity), individualized, not "eat less, move more."
2. **A named dietitian who owns the patient** — intensive arms (STEP 3) ran up to 30 individual visits.
3. **Recurring counseling on a schedule** — contact every 4 weeks, tighter early; some protocols ≥14 sessions in 6 months.
4. **Self-monitoring that's actually reviewed** — daily logs a professional reads and acts on. Accountability, not just tracking.

**The wedge: the experiment has already been run.** Deliver these four ingredients at telehealth scale and cost, and real-world outcomes converge toward trial-grade ones. Everyone helps you *start* therapy; nobody owns *keeping you on it*.

---

## Why we win where Calibrate died (say this before judges ask)

The "GLP-1 + wraparound support" thesis has been tried — Calibrate raised over $100M on it and collapsed. It failed on two structural choices Cadence deliberately avoids:

- **It owned prescribing and fulfillment**, taking on drug supply and cost risk. Cadence attaches to *any* prescription — a partner telehealth provider, an employer benefit, or the patient's own clinician. We never touch the drug.
- **Its support layer ran on human coaches**, at unit economics that could never scale. Cadence moves the constant work (the same twenty questions, plan drafting, log review) to AI and spends scarce human clinician time only where it changes the outcome.

The thesis was right; the cost structure was wrong. AI is what changes the cost line — that's the "why now."

---

## What Cadence is

An AI-powered adherence and support program that recreates each trial ingredient as a named mechanic, backed by real clinicians for judgment moments, wrapped in a behavior-based game layer that gives patients a reason to stay engaged on the ~340 days a year they are not talking to a clinician.

**The user journey:**

- **Day 0 — onboarding is the trigger to start, not the end.** The moment meds are on the way, Cadence pulls intake answers, baseline labs (A1c, lipids), goal and dose schedule — and within minutes produces a concrete week-one plan: protein target, step target, simple calorie range, and a plain-language walkthrough of the first injection and titration timeline. This directly answers "I got the meds but didn't know how to begin."
- **Daily to weekly — the companion loop.** Log the injection, capture meals, sync scale/CGM/BP, get same-day feedback plus one next small action. The coach is on 24/7 for the 11pm nausea question.
- **Adaptive check-ins — the rhythm.** Contact tightens right after a dose step-up (when side effects and drop-off spike) and relaxes when the patient is cruising. Red flags auto-escalate to a human.

---

## The four mechanics

**1. Adaptive Plan Engine — the prescription.** Turns "eat more protein" into "hit 110g today, here are three ways." Generates an individualized diet/activity plan from intake, labs, and goals, then re-titrates weekly against logged data and the medication schedule. If weight drops too fast, it raises the protein floor to guard against lean-mass loss; if activity collapses, it shrinks the goal to something achievable rather than letting the habit die.

**2. Named AI Coach + human on tap — the dietitian.** Trial trust comes from a named person who knows your case. Cadence recreates the continuity with a persistent, named AI coach that remembers everything and is available around the clock — and recreates the credibility with real registered dietitians behind it (Plus tier and all safety escalations). The AI absorbs the volume work so the RD's time goes only where it changes the outcome.

**Safety architecture (load-bearing):** the coach's *medical* answers — side effects, titration, symptom guidance — are retrieved from a clinician-approved protocol library. The AI matches the patient's situation to the right protocol and personalizes the delivery; it never authors medical guidance at runtime. Anything unmatched or above threshold escalates to a human. Diet, activity, and motivational coaching are generative — that's coaching, not medicine. The failure mode is always "ask a human," never "guess."

**3. Proactive Cadence Loop — recurring counseling.** Trials schedule monthly contact; Cadence makes the rhythm adaptive. It reaches out after a dose change, a bad-data stretch, or when chat sentiment turns negative — and eases off when things are stable. Most contact is async chat; the loop auto-books a human session on red flags: rapid loss, GI symptoms, low mood, or "I'm thinking of stopping."

**4. Closed-Loop Review — self-monitoring that's read.** The trial insight is not "track your food" — it's that a professional *reviews* what you track and responds. Cadence guarantees no entry goes unread: AI reviews every log, closes the loop with same-day feedback, and triages exceptions to the clinician queue so humans see signal, not noise. That closed loop is the accountability that separates trial adherence from real-world drop-off.

---

## The gamification layer

Deliberately engineered, because bad gamification in health is a liability. **Governing rule: reward behaviors that drive outcomes, never weight itself.** Its job is retention between doses — a reason to open the app on days no clinician is involved.

**Mechanics (behavior-based):**
- Streaks for injections and daily logging — consistency is the entire game. **Streak repair built in:** honestly logging a missed dose preserves the streak with a note. A missed dose reported is more valuable than a streak protected by silence — we never punish honesty.
- Protein quests and step challenges tied to the day's adaptive plan.
- Adherence levels that unlock as habits stick.
- Non-scale victories — energy, better labs, waist, sleep.
- Opt-in cohort leagues for social pull without shaming.

**Safety by design (explicit exclusions):** no weight leaderboards, no rewards for eating less, no mechanic that could reinforce disordered eating. Every reward is screened against ED risk. This exclusion list is itself a credibility asset in front of health judges.

**The learning loop — inputs that teach.** Rewards only reinforce learning if the patient does something to earn them. Every game input is a small, deliberate micro-action that does double duty — feeds the AI and teaches the patient through active recall and immediate feedback:

- **Tap to log injection + rate side effect** → dose streak; normalizes titration, links symptoms to timing; feeds adherence signal and escalation triggers.
- **Snap a meal / log protein** → quest progress; builds portion and protein awareness; feeds plan re-titration and the muscle-loss guardrail.
- **15-second recall quiz** ("today's protein target?" "which foods ease nausea?") → points + spaced repetition; cements condition knowledge; maps the patient's knowledge gaps.
- **Weekly reflection / teach-back** ("what worked?") → level-up; consolidates learning by self-explanation; feeds sentiment and personalization.
- **Set one weekly micro-goal** → commitment mechanic; builds agency; feeds nudge targeting.
- **Sync scale / BP / glucose** → trend unlocks + non-scale victories; teaches reading their own biomarkers; feeds closed-loop review.

**Design constraint — minimum viable input:** every input is one tap, one photo, or one ten-second question, and always returns a reward and a lesson. Input friction is itself a top driver of drop-off; the learning loop must feel like the game, never a data-entry chore.

---

## Tiers

- **Core** — named AI coach, Adaptive Plan Engine, closed-loop review, full gamification. AI-only. For whole employer populations and cost-sensitive self-pay. Mass scale.
- **Plus** — everything in Core plus a real named registered dietitian for scheduled sessions and escalation. For patients who want or clinically need a human; higher willingness to pay.

The split sells to buyers as a population product while capturing upgrade revenue from individuals — and lets the demo show both the AI-only and human-augmented experiences.

---

## Architecture

- **Inputs:** intake questionnaire, baseline and follow-up labs, medication and dose schedule, connected devices (smart scale, CGM, BP cuff), daily food/injection/symptom logs.
- **AI core:** Adaptive Plan Engine (plan generation + weekly re-titration), the Coach (conversational, memory-persistent, protocol-grounded, escalation-aware), the Review engine (reads every entry, generates feedback, triages exceptions).
- **Human-in-the-loop:** RDs and clinicians receive AI-summarized patient snapshots and only flagged exceptions, so one clinician safely supports many multiples of a traditional panel. The AI supports and escalates; it never diagnoses.
- **Outputs:** the patient's daily plan and feedback, the clinician's exception queue, the buyer's population dashboard (persistence, engagement, outcomes).

---

## Business model & go-to-market

- **Beachhead: telehealth GLP-1 providers who need a retention layer (B2B2B) — starting with eMed itself.** The buyer for this product is in the judging room: a provider whose economics improve directly when patients persist. Cadence white-labels as their retention layer.
- **Scale: self-insured mid-market employers (B2B2C).** They feel GLP-1 cost directly on the P&L and are hunting for ways to protect that spend. Sold on avoided cost — a patient who stays on therapy and doesn't regain is cheaper than one who churns and cycles back. Deliberately not built on fragile RPM reimbursement codes (several being cut in 2026).
- **Channel:** benefits consultants and brokers (Mercer, Gallagher), employer coalitions.
- **Secondary:** value-based provider groups and ACOs carrying downstream cardiometabolic cost.
- **Consumer upgrade:** individuals move from Core to Plus for a human dietitian.

---

## What we measure

- **North Star: 12-month therapy persistence** — the only number that captures "stayed on the pathway and sustained results," and what buyers actually pay for. (We can't measure 12 months in a weekend — the demo shows the leading indicator, week-one activation, end to end.)
- **Activation:** % with a plan + first log in week 1 — the leading indicator of persistence.
- **Engagement:** weekly logging + check-in completion — the mechanism; tracked, never optimized as the goal.
- **Outcomes:** weight, A1c, BP, lean-mass proxy — confirms persistence translates into real, safe cardiometabolic benefit.

---

## Risks & mitigations

- **"This has been tried" (Calibrate, Noom Med, Omada)** → the thesis was right, the cost structure was wrong; we don't own the drug and the constant work is AI-cost, not human-cost. (Full answer in Judge Q&A.)
- **Clinical safety / AI scope** → protocol-library grounding for all medical content; AI escalates, never diagnoses; RD/clinician backstop on all red flags.
- **Regulatory posture** → positioned as adherence and coaching support, not the practice of medicine; human clinicians own clinical decisions.
- **Reimbursement volatility** → revenue anchored to provider/employer avoided-cost, not FFS RPM codes exposed to payer policy changes.
- **Gamification harm** → behavior-based rewards only; explicit exclusion of weight competition and restriction mechanics; ED-risk screening; streak repair.
- **Engagement decay (health apps lose most users by month 3)** → the game layer exists for exactly this; adaptive cadence means the app reaches out at the moments drop-off actually happens (dose changes), not on a fixed schedule.
- **Demo credibility** → one screen that shows the closed loop in action: the coach catching a problem and responding, plus the human escalation.

---

## Hackathon MVP (the demo)

A single patient flow that makes the closed loop visible, plus one clinician surface:

1. **Onboarding → instant personalized plan.** Adaptive Plan Engine generates week-one protein/step/dose guidance from a mock intake. (Answers the activation gap on screen.)
2. **The named AI coach** answers a side-effect question — visibly grounded in a clinician-approved protocol — and adapts the plan.
3. **A logging + streak moment** showing the gamification and a same-day "I reviewed your week" closed-loop response.
4. **A red-flag escalation** handing off to a human RD — shown on a second surface: the RD's exception queue, with the AI-summarized patient snapshot. This proves the safety model *and* makes the "one clinician, 10x panel" economics visible.

Everything runs on fixtures behind an env flag; live model calls are a toggle shown if judges ask. No demo-day wifi dependency.

---

## Evidence base (verify the starred items before demo day)

- ★ JMIR (2026) — *After the Prescription: The Clinical Support Gap in Telehealth-Based GLP-1 Care.*
- ★ Obesity Reviews (2026) — scoping review: ~40% of weight lost as lean tissue; only 3 of 12 trials used a dietitian; recommends hybrid model.
- JMCP (2024, 2026) — real-world GLP-1 persistence 32–50% and adherence 51–54% at 1 year.
- STEP 1–5 — monthly dietitian counseling, 500 kcal/day deficit, 150 min/week activity, reviewed daily logs. STEP 3 — up to 30 dietitian visits.
- SURMOUNT-3 — 12-week face-to-face lifestyle counseling lead-in before medication.
- ISPOR 2025 / Truveta; Medscape — persistence and discontinuation-reason data (side effects = 28% of discontinuations).
- GM Insights / Healthcare IT News — RPM market ~$28.6B (2026). Welby Health / HealthSnap — 2026 CMS RPM code changes.

★ = load-bearing and quoted with specificity; confirm the citation exists as described before it goes on a slide.

---

## Naming note

"Cadence" collides with an existing US healthtech company (cadence.care) doing remote chronic-condition monitoring — adjacent space. Fine as a working name for the weekend; acknowledge gracefully if a judge notices; rename before anything public.
