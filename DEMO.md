# Cadence — Demo Runbook

**Live URL:** https://cadence-hack-production-dc71.up.railway.app
Clinic: `/clinic` (laptop) · Patient: `/patient` (phone, installable PWA)
Everything runs on prod: live AI extraction (gpt-5.5), volume-backed persistence.

---

## 30 minutes before

1. **Delete the Vercel deployment** (broken twin — loads forever, kills credibility if anyone opens it)
2. On the clinic screen: press **Reset** for a clean slate
3. Verify: open `/health` → must say `"aiMode":"live"`
4. Phone: install the PWA (`/patient` → browser menu → Add to Home Screen) — launches full-screen, no browser chrome
5. Phone charged, on venue wifi **or phone hotspot** (extraction needs internet on the *laptop*; the phone only needs to reach the app)
6. **Do NOT redeploy during judging.** Data survives deploys now, but a deploy mid-demo = 2 minutes of downtime
7. Agree who: drives laptop / holds phone / narrates

## The 3 minutes

**0:00 Hook (20s)** — *"Patients forget 40–80% of what's said in a consultation, and half of what they remember is wrong. Real-world GLP-1 persistence is 32–50% at one year — versus 80–93% in trials. The difference is the support layer. We built it."*

**0:20 Clinic (60s)** — Patients tab → **create a record live** (use a judge's first name if one's willing) → *read the code out loud* ("CAD-7K2F — that's your NHS-login stand-in"). Open consult → paste the sample consult → **Extract care plan**. While AI works (~5–10s), say the whitespace line: *"The transcript already exists in thousands of clinics — scribes stop at the note. We're the layer that turns it into the patient's life."* Sidebar assembles → open a section or two (accordion) → **Edit → change the metformin dose** → *"the AI drafts, the clinician owns every word — including the safety protocols"* → **Approve & send**.

**1:20 Phone (60s)** — Enter the code → onboarding: point at the **consent checkbox** (*"the data flow exists because she granted it"*) → plan lands. Scroll Today: plan-derived checklist, streak, tap a task done. Plan tab: medication cards with the clinician's own "why", titration *you-are-here*, tap **Explain it simpler** once. Then tap a **red flag → check-in → Nausea/moderate → send**. Protocol steps come back instantly: *"those words were written by the clinician, not the AI — the AI never authors medical advice."*

**2:20 Close the loop (30s)** — Laptop: **Inbox tab badge is lit**. Open the flag: name, code, *"currently on 0.25 mg (weeks 1–4)"* → **Mark read**. Flash the **Audit log** (every event, plan diffs in +/−/~). Optional if time: phone Progress → log glucose **11.9** → second flag appears live.

**2:50 Close (10s)** — *"The consultation used to end at the door. Now it doesn't end at all."* + feasibility beat: NHS login for identity, clinician in the loop for anything medical, Obesity & Cardiovascular next (show the greyed dropdown).

## If judges want the kill shot

Ask one to **dictate a consult in their own words** (any meds, any condition-ish content) → paste → Extract → their words come back structured. This is the "is it really AI?" proof — nothing scripted can do it.

## Contingencies

| Problem | Move |
|---|---|
| Extraction slow | Keep narrating the whitespace line; it lands in <15s |
| OpenAI fails mid-demo | Automatic fallback serves the sample plan — the demo continues; don't announce it |
| Phone/wifi dies | Second browser window on the laptop at `/patient` — same flow |
| Rendering crash | Error boundary shows Reload — press it, state is server-side, nothing lost |
| Sent the wrong dose | Edit the live plan → "Send update" → patient gets "plan updated" — **this is a feature, show it off** |
| Accidental Reset | Everything wipes — recreate in ~60s; only Reset and volume deletion destroy data |

## Q&A one-liners (rehearsed, not improvised)

- **"Is the medical advice AI-generated?"** — *No, structurally can't be. AI extracts and explains; every medical response the patient gets is a clinician-authored protocol served by deterministic code, escalation by coded thresholds. AI routes, never writes.*
- **"Isn't this Calibrate/Noom?"** — *Thesis was right, cost structure was wrong: they owned the drug and ran on human coaches. We attach to any prescription and the constant work runs at AI cost.*
- **"How do you identify patients?"** — *Identity originates with the provider — clinician issues the code; production is NHS login. Never self-asserted.*
- **"Data privacy?"** — *Patient devices only ever receive their own record — roster, clinic inbox, audit log never cross the wire. Production adds auth so scope is enforced by identity.*
- **"What did you NOT build?"** — *Real device integrations, EHR feed, auth, speech-to-text — all named production path. We spent the weekend on the unsolved part: the handoff and the loop.*

## Honest boundaries (never overclaim)

- Scope isolation is response-level, not authentication
- Symptom matching is keyword-based (unmatched symptoms escalate to a human — safe, but literal)
- Calendar export uses standard times, not parsed from the plan
- Single clinician, T2D only, audit log capped at 200 — all deliberate scope
