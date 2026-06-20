# Client nutrition — UX design

## Goal

The client-side eating experience: see today's plan and macro targets, log what
you ate with one tap, and review past days. Mobile-first.

Backs the schema/API in
`2026-06-20-coaching-profile-nutrition-schema-api-design.md`. Sibling of the
client training spec (`2026-06-20-client-training-ux-design.md`) and the
nutrition builder (`2026-06-20-nutrition-plan-builder-ux-design.md`), reusing
their patterns.

Validated mockups are preserved in `assets/client-nutrition/`. ASCII wireframes
below are the durable record.

## Shape: one continuous screen, not a session

Unlike workout logging (start → log → finish), eating is logged throughout the
day. There is **no session and no finish** — the **Today** screen is
date-navigable and is both the plan view and the log surface. Surfaces:

1. **Today** — daily macros vs target + meal slots you log into (the heart)
2. **Logging interactions** — tap-to-eat, adjust amount, replace, off-plan
3. **History** — past days (a past date renders the same Today screen)

## Inherited patterns (no re-decision)

- Keyboard-aware **amount sheet** (docked above keyboard, live macros) — shared
  with the nutrition builder.
- **Food/Recipe picker** sheet (search, toggle, create-from-no-match).
- Pre-filled planned item → **one tap to confirm** (from workout-set logging).
- `weight_g` is the resolved calc value; macros snapshot at log time.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Macro hero | **Calorie ring + protein/carbs/fat bars** | Calories are the one glanceable number; macros support it. |
| Day anchor | **Date navigator** (+ weekly strip in history) | No session; navigate days. |
| Log a planned item | **Tap ✓ = ate as planned** (pre-filled) | One tap for the common case. |
| Adjust | **Tap item → docked amount sheet**, live macros | Ate more/less. |
| Bulk | **"Log whole meal" / "Log whole day"** | Fast path when the plan was followed. |
| Off-plan / replace | **Food picker → pick slot** | Ate something else / extra. |
| Past days | **Editable**; future read-only | Log a forgotten meal; can't pre-log. |

## Surface 1 — Today

```
┌ ‹  Today · Wed  › ──────────┐  ← date navigator
│ ┌────────┐ Protein 120/180 ▓│  ← macro hero: calorie ring + 3 bars
│ │ 1640   │ Carbs   150/200 ▓│
│ │ of 2100│ Fat      40/60  ▓│
│ └────────┘                  │
│ Breakfast            ✓ done │
│  ☑ Oats & Eggs          420 │  ← logged (green)
│ Lunch        ✓ log whole meal│
│  ☐ Chicken & Rice       650 │  ← tap ☐ to log
│  ☐ Broccoli 100g         35 │
│ Dinner               630·later│
│ ＋ Add food off-plan        │
└─────────────────────────────┘
```

- Macro hero updates **live** on every log — nutrition's feedback loop (the
  rest-timer equivalent).
- Meal slots come from the plan snapshot for the day; each shows planned items
  with an eaten checkbox.
- Slots: `breakfast, morning_snack, lunch, afternoon_snack, dinner,
  evening_snack`.

## Surface 2 — Logging interactions

### Tap ✓ = ate as planned
One tap logs the planned item with its planned amount (`source: planned`,
macros snapshotted). "✓ log whole meal" logs the slot; "log whole day" logs all
planned.

### Tap the item → adjust / replace (docked sheet)
```
┌ Chicken & Rice           ✕ ┐
│ [as planned·250g] [grams]  │
│ [ AMOUNT  250 g ]          │
│ eaten → 650 kcal · 52/80/12│  ← live, updates per keystroke
│ [ ✓ Log it ]               │
│ [🔄 Replace] [🗑 Not eaten]│
├── numeric keypad ──────────┤
```
Ate more/less → change amount (still `source: planned`, new `weight_g`).

### Off-plan / replace → food picker
Same picker as the builder (Foods/Recipes toggle, search), then **pick the meal
slot**. Off-plan add → `source: unplanned`. "Replace" → `source: replacement`
(links the planned slot, logs the new food).

### Source semantics (schema)
```
planned      tap ✓ / log-meal / log-day / adjusted amount
replacement  ate something instead of a planned item
unplanned    off-plan extra
```
Every `food_log_entry` snapshots its macros at log time → history never shifts.

## Surface 3 — History

```
WEEK OVERVIEW                 PAST DAY (Fri Jun 13)
┌ ‹ This week › ──────┐       ┌ ‹ Fri·Jun13 › ──────┐
│ M  T  W  T  F  S  S │       │ ◯1990/2100 on target│
│ ◯  ◯  ◯  ◯  ◯  ·  · │       │ Breakfast           │
│ 98 102 70 118 95    │       │  ☑ Oats & Eggs   420│
│ ●on ●under ●over ●— │       │ Lunch               │
│ Recent days         │       │  ☑ Chicken & Rice 650│
│ Fri Jun13 1990 ·on  │       │  ☑ Apple [off-plan] │
│ Thu Jun12 2480 ·over│       │ Dinner              │
│ Wed Jun11 1480 ·under│      │  ☑ Beef [replaced]  │
└─────────────────────┘       └─────────────────────┘
```

- Week overview: 7-day adherence rings (on / under / over / no-log) + recent-days
  list. Tap a day → opens it.
- Past day: the same Today layout for that date; replaced / off-plan badged;
  still editable.
- Reads only: past date `GET /meal-logs?date=`; week `?from=&to=` coloured on
  consumed-vs-target. No separate history model. Coach sees the same day via the
  read-only coach endpoint.

## Reconciliation with existing code

`nutrition-daily.tsx` already implements most of this on a near-current schema.
Align field names to the schema spec (`target_*` vs `macros_goal`, slot enum)
and the source/snapshot rules; the structure (date nav, weekly strip, macro
progress, meal-slot logging, add-food, log-day) carries over.

## API mapping

| Action | Endpoint (nutrition API spec) |
|---|---|
| Today's plan (slots) | `GET /v1/client/nutrition-plans/today?date=` |
| Day's logs | `GET /v1/client/nutrition-meal-logs?date=` |
| Week overview | `GET /v1/client/nutrition-meal-logs?from=&to=` |
| Log / adjust / remove entry | `POST` / `PATCH` / `DELETE /v1/client/nutrition-food-log-entries` |
| Log whole meal / day | `POST /v1/client/nutrition-food-log-entries/log-meal`, `/log-day` |
| Off-plan / replace food search | `GET /v1/client/nutrition-foods`, `/nutrition-recipes` |

## Visual references

`assets/client-nutrition/`:

- `01-today.html` — macro hero (ring vs bars) + meal-slot logging
- `02-logging.html` — tap-to-eat, adjust sheet, off-plan/replace picker
- `03-history.html` — week adherence overview + past day

## Out of scope

- A separate "finish day" step (no session model)
- Macro hero as four co-equal bars (calorie ring chosen)
- Barcode scanning / photo logging (later)
- Water / micronutrient tracking (out of schema scope)
- Coach-side review UI (read-only coach endpoints)
</content>
