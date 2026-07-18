# Design Map — demo-ui → apps/web

> **Status: PORTED (Jul 18).** The design-complete prototype (now at `demo-ui/`,
> still read-only) was ported into apps/web wholesale: all 13 design components,
> both surfaces, tokens, fonts, and object renders. The verdicts below predate
> the "Design-complete" commit and are kept for history — notably,
> `TranscriptStream`/`PlanSidebar` were re-classified from *skip* to *adopt*
> because the final design includes the consult-handoff flow.

Step 4 of [DELIVERY.md](../../DELIVERY.md). `demo-ui/` is the design source of truth and is **read-only** — nothing is edited there; we port ideas, not files. Verdicts: **adopt** (port the pattern), **adapt** (port with changes), **skip** (legacy or out of scope), **done** (apps/web already has an equivalent).

## Design language (from demo/docs/VISION.md)

Soft-light-glass: pale mint→sky canvas, translucent white cards, high-contrast ink, pine-green shared accent. Patient surface = premium frosted glass (legible for a 52-year-old); clinic = clean, dense clinical tool. apps/web currently uses a warm-paper palette (`--color-care`, `--color-sand`) — close in spirit; adopt the mint→sky canvas + glass cards only if time allows (pure CSS swap, no logic).

## Component verdicts

| /demo component | Verdict | Notes |
|---|---|---|
| `PhoneFrame` | **done** | apps/web has its own; demo's adds a status bar over warm paper — cosmetic, steal if polishing. |
| `PatientTabBar` (inline SVG icons) | **adapt** | apps/web tab bar is text-only; demo's stroke icons are a cheap polish win. |
| `TodayTab` | **done** | apps/web equivalent exists (plan metrics + daily actions + review card). |
| `ProgressTab` (glucose trend via `computeTrend`) | **adapt** | apps/web Progress has streaks/quests/logs but **no biomarker trend read-out** — this is FR-5.2's missing half and the "reads their own biomarkers" pitch beat. Port the trend + plain-language line. |
| `TitrationTimeline` ("you are here" dose ladder) | **adopt** | Strongest single component in /demo; apps/web shows no titration timeline anywhere despite the plan carrying `titrationTimeline`. High demo value, low cost. |
| `MedicationCard` | **adopt** | What/dose/when/why card — belongs on Today or a Plan tab. |
| `SimplifyCard` (re-explain at simpler levels) | **adapt** | Great judge moment ("explain it simpler") — port only if time; fixture-able. |
| `GuideSheet` (step-by-step how-to) | **adapt** | Maps to the injection walkthrough (FR-1.2 "how to start"). Also the seed of the A2UI beat below. |
| `CheckInSheet` (structured severity check-in) | **adapt** | apps/web's symptom log is a form; demo's sheet pattern (structured severity picker) is closer to FR-3.1's one-tap intent. |
| `GlucoseSheet` | **adapt** | Pairs with the ProgressTab trend port. |
| `ClinicView` / `InboxPanel` | **done** | apps/web ClinicPage covers queue + resolve; demo's version is denser — reference for layout polish only. |
| `PatientView` | **done** | Container equivalent exists (`PatientPage`). |
| `TranscriptStream` | **skip** | Legacy consult-handoff concept (live transcript streaming). Not in the Cadence flow. |
| `PlanSidebar` | **skip** | Legacy clinician-extraction sidebar from the old concept. |

## Porting priority (if time allows, in order)

1. `TitrationTimeline` → patient Today tab (adopt, ~30 min, big pitch value)
2. Glucose trend + plain-language read-out → Progress tab (FR-5.2 gap)
3. `MedicationCard` → Today tab
4. Tab bar icons + soft-light-glass palette (cosmetic pass)
5. `SimplifyCard` / `GuideSheet` (judge-question ammo)

## Noted for later — A2UI beat

demo/docs/VISION.md names a planned hero moment: agent-composed block UI (`videoGuide`, `chart`, `checklist`, `protocolSteps`, `statTile`, `text`) rendered from a fixed catalog. Out of scope for the current FRD; if the team wants it, it becomes FR-7.x and a new `blocks` field on `CoachMessage` — raise before building.
