# MVP Feature List — CoachEasy

**Date:** 2026-03-25
**Goal:** Onboard first 10-20 Indian fitness coaches with the core coaching loop.

---

## MVP Scope (7 Features)

The MVP is the complete coaching loop: coach builds plans → invites client → client follows plans and logs progress → coach tracks results.

```
COACH SIDE                           CLIENT SIDE
─────────────                        ────────────
#1 Build training plans              #4 Log training progress
#2 Build nutrition plans             #5 Log nutrition
#3 Invite + manage clients           #6 Track weight
                                     #7 Track progress photos
```

Everything else is backlog. No storefront, no dashboard, no messaging, no check-in forms, no notifications, no PDF export. Those come after we validate the core loop works.

---

## Feature Status

| # | Feature | Coach/Client | Spec status | Code status |
|---|---------|-------------|-------------|-------------|
| **1** | Training plan builder | Coach | ✅ Spec complete | ❌ Not built |
| **2** | Nutrition plan builder | Coach | ✅ Built + improvements spec'd | ✅ Built |
| **3** | Client management (simplified) | Coach | ⚠️ Needs simplified spec | ✅ Partially built |
| **4** | Training logging | Client | ❌ Needs spec | ❌ Not built |
| **5** | Nutrition logging | Client | ❌ Needs spec | ❌ Not built |
| **6** | Weight tracker | Client | ❌ Needs spec | ❌ Not built |
| **7** | Photo progress tracker | Client | ❌ Needs spec | ❌ Not built |

---

## Feature Details

### #1 — Training Plan Builder (Coach Side)

**Spec:** `ux-spec-training-plan-builder.md` (complete)

Coach creates training plans with the set-scheme input pattern: pick exercise → fill `[4] [8-10] [80kg] [120s]` → add. Full plan in ~90 taps.

**What exists:** Exercise library (CRUD, system exercises, infinite query, muscles/equipment). Training plan API (all endpoints wired in `trainingPlans.ts`). No UI.

**What to build:** List, create, detail/builder, edit screens. Set-scheme input component. Exercise picker inside the builder. Copy workout. Overview mode (one-line-per-exercise).

**Depends on:** Exercise library (built). Exercise UX improvements (EX-1 to EX-6, spec'd — nice to have but not blocking).

---

### #2 — Nutrition Plan Builder (Coach Side)

**Spec:** Multiple improvement specs (UX-1 to UX-7, RX-1 to RX-6, FX-1 to FX-8)

**What exists:** Fully built and functional — plan CRUD, meal builder, day planner, food/recipe picker, plan assignment to client. Food library with system foods. Recipe builder.

**What to build for MVP:** Nothing blocking. The improvement specs (per-meal macros, serving size chips, macro key mismatch fix, etc.) are polish — they make the builder better but it already works.

**Recommended MVP polish (small effort, high impact):**
- FX-1: Fix macro key mismatch bug (data integrity — do this)
- UX-7: Serving size quick-fill (already implemented by team)
- UX-5: Plan-level macro summary (hook exists, just unwired)

Everything else from the improvement specs can wait.

---

### #3 — Client Management (Simplified for MVP)

**Previous spec:** `ux-spec-enriched-client-management.md` — comprehensive with payment tracking, offer links, intake answers, etc.

**MVP simplification:** Strip it down to what the coach actually needs for the first 10 clients:

```
Client (MVP fields)
├── first_name, last_name
├── email (nullable), phone (nullable)
├── instagram_handle (nullable)
├── notes
├── status: active | pending | expired | archived
├── program_name (nullable)        ← "Fat Loss 12 Weeks"
├── program_start (nullable)       ← date
├── program_end (nullable)         ← date
├── inserted_at, updated_at
```

**What's CUT from the full spec for MVP:**
- Payment tracking (payment_status, payment_amount, payment_notes) — coaches track this on WhatsApp/UPI for now
- Offer linkage (offer_id) — no storefront in MVP
- Intake answers — no storefront forms in MVP
- Source tracking — no storefront in MVP
- "Payment due" filter tab — no payment tracking
- "Mark as paid" quick action — no payment tracking
- Lead/inquiry creation from public form — no storefront

**What STAYS:**
- Status auto-computation from program_end dates (active/expiring/expired)
- Client list with filter tabs: [All] [Active] [Expiring] [Expired] [Pending] [Archived]
- Client detail with program section (name, dates, time remaining)
- Invite flow with shareable link + WhatsApp share
- Training plans section on client detail (assign + view)
- Nutrition plans section on client detail (already built)
- WhatsApp deep links on client card and detail
- Renew flow (shift dates forward)

**Needs:** Simplified spec (subset of the full enriched client management spec). Small backend change (add program_name, program_start, program_end to Client model). Frontend: updated card, detail page program section, filter tabs.

---

### #4 — Training Logging (Client Side)

**What it is:** The client opens the app, sees today's workout, logs their actual sets/reps/weight as they train.

**This is the most important client-side feature.** It's what makes the platform valuable to the client (not just the coach). Without it, the client has no reason to open the app.

**Core flow:**
```
Client opens app
  → Sees today's workout (from assigned training plan)
  → Taps an exercise → sees planned sets
  → Logs actual performance per set: reps done, weight used
  → Marks exercise complete
  → Workout summary at the end
  → Coach sees the logged data on their dashboard (future) / client detail
```

**Key design questions to answer in spec:**
- How does the client navigate between workout days?
- How does "today's workout" get determined from the plan's day_number + start date?
- What does the logging UI look like per set? (pre-filled from plan, client adjusts actuals)
- Rest timer between sets?
- What happens if the client skips an exercise or adds an unplanned one?
- How does the coach view the client's logged data?
- Offline support? (gym connectivity is unreliable)

**Data model consideration:** Need a new entity — `WorkoutLog` or similar — that records what the client actually did vs what was planned. This is separate from the `PlannedWorkout` (which is the coach's prescription).

**Depends on:** Training plan builder (#1) — client needs assigned plans to log against.

---

### #5 — Nutrition Logging (Client Side)

**What it is:** The client logs what they actually ate, tracked against their assigned meal plan.

**Core flow:**
```
Client opens app → nutrition tab
  → Sees today's meal plan (meals + target foods/amounts)
  → Logs actual food intake:
    - Quick log: tap a planned food item → "ate this" (marks as consumed)
    - Custom log: search food database → add to a meal slot
    - Amount adjustment: "ate 200g instead of 150g"
  → Daily macro summary: planned vs actual (calories, protein, carbs, fats)
  → Coach can see adherence on their side
```

**Key design questions:**
- How closely do we tie logging to the meal plan vs freeform food diary?
- Do we show per-meal compliance (green/yellow/red vs targets)?
- Food search: same database as the coach's food library? System foods + coach-created?
- Barcode scanner? (Kahunas has it but reviews say it's broken — defer?)
- Simplest possible logging for the client who just wants to say "I followed the plan today"

**Data model:** `NutritionLog` — daily log entries with food items, amounts, linked to meal plan.

**Depends on:** Nutrition plan builder (#2) — client needs an assigned plan. Food database (exists).

---

### #6 — Weight Tracker (Client Side)

**What it is:** Client logs their weight regularly. Coach sees the trend.

**This is the simplest feature in the MVP but one of the most important.** Weight is the primary metric Indian coaches track. "Did you lose weight this week?" is the first question in every check-in.

**Core flow:**
```
Client opens app → progress tab
  → Current weight: 93.5 kg
  → Logs new weight: [92.8] kg → Save
  → Chart shows weight over time (line chart, last 30/60/90 days)
  → Coach sees the same chart on the client detail page
```

**Key design questions:**
- How often should the client log? (Daily? Weekly? Up to them?)
- Show moving average to smooth daily fluctuations?
- Goal weight line on the chart?
- Units: kg (default for India), lbs option

**Data model:** Simple — `WeightLog { client_id, weight_kg, logged_at }`. Array of entries, plotted as a time series.

**Depends on:** Client app exists (#3 — client account).

---

### #7 — Photo Progress Tracker (Client Side)

**What it is:** Client takes progress photos at regular intervals. Coach compares them over time. These photos become the coach's marketing material (with permission) for testimonials.

**Core flow:**
```
Client opens app → progress tab → photos
  → Takes/uploads photo
  → Tags: front / side / back
  → Date auto-stamped
  → Gallery shows all photos chronologically
  → Coach sees the photo gallery on client detail page
  → Coach can compare two photos side-by-side (before/after)
```

**Key design questions:**
- Photo categories/angles: front, side, back? Or freeform?
- Guided photo taking (outline overlay showing how to pose)?
- Privacy: photos visible to coach only? Client controls sharing?
- Storage: where do photos live? S3/cloud storage with signed URLs?
- Compression: photos taken on phone cameras are 4-12MB. Need client-side compression before upload.
- Coach-side comparison tool: side-by-side viewer with date labels

**Data model:** `ProgressPhoto { client_id, image_url, photo_type (front/side/back), logged_at }`

**Depends on:** Client app exists. Image upload infrastructure (backend).

---

## Build Order

```
PHASE 1 — Coach tools (Weeks 1-4)
  #1 Training plan builder        ← start here, spec complete
  #2 Nutrition plan MVP polish    ← FX-1 bug fix + UX-5 macro summary
  
PHASE 2 — Client foundation (Weeks 3-6)
  #3 Client management (simplified) ← program dates + status auto-compute
  Client app scaffold              ← auth, navigation, basic shell
  
PHASE 3 — Client logging (Weeks 5-10)
  #4 Training logging              ← the core client experience
  #6 Weight tracker                ← simplest feature, ship alongside #4
  #7 Photo progress tracker        ← ship alongside #4
  
PHASE 4 — Nutrition logging (Weeks 8-12)
  #5 Nutrition logging             ← more complex than training logging
```

**Why this order:**
- Phase 1: Coach needs to build plans before anything else. Training plan builder is the biggest missing piece.
- Phase 2: Client management enrichment is small (add 3 fields + status logic). Client app scaffold needs to happen in parallel.
- Phase 3: Training logging is the killer feature — it's what the client opens the app for. Weight and photo tracking are simpler and ship alongside.
- Phase 4: Nutrition logging is last because it's the most complex client-side feature (food search, meal matching, macro calculation) and coaches can manage without it initially (clients report nutrition adherence on WhatsApp).

---

## Specs Needed (in build order)

| Order | Feature | Type of spec |
|-------|---------|-------------|
| 1 | ~~Training plan builder~~ | ✅ Done |
| 2 | Client management (MVP-simplified) | Trim existing spec |
| 3 | Client app architecture | New — app shell, auth, navigation |
| 4 | Training logging | New — full UX spec |
| 5 | Weight tracker | New — small UX spec |
| 6 | Photo progress tracker | New — full UX spec |
| 7 | Nutrition logging | New — full UX spec |

---

## Backlog (Post-MVP)

Ordered by expected impact:

1. Coach dashboard (pending/expiring/recent activity overview)
2. Storefront page + offers + testimonials
3. Storefront visual editor
4. Check-in forms (custom weekly forms)
5. In-app messaging (coach ↔ client)
6. Notifications (push + in-app)
7. PDF export of plans
8. Payment tracking on client (payment_status, amount, notes)
9. Client intake from storefront (inquiry → pending client)
10. Progress photos overlay/comparison tool
11. Habit tracking (daily habits, streaks)
12. Payment collection (Razorpay integration)
13. Content library (drip video/PDF delivery)
14. Automations
15. Analytics