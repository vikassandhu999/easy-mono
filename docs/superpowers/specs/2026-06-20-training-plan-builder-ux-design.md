# Training plan builder — UX design

## Goal

One-page, no-navigation, mobile-first builder where a coach composes an entire
training plan — workouts, exercises, sets, and the weekly schedule — without
ever leaving the page.

Backs the schema/API in
`2026-06-20-coaching-profile-training-schema-api-design.md`. This spec is UX
only: layout, components, and interactions.

The visual mockups validated during design are preserved alongside this spec in
`assets/training-plan-builder/` (open in a browser, or via the brainstorming
visual companion). The ASCII wireframes below are the durable record.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Plan structure | **Workout-first** | Workouts are first-class, plan-scoped, reusable entities; the schema maps `schedule_entry: day → workout`. Day-first fights reuse. |
| Day view | **Read-only projection** of the schedule | The week is built by assignment; a day-first calendar is just a view of it, not a second editor. |
| Page layout | **A — inline accordion + pinned week bar + collapse-all** | Wins whole-plan scan and cross-workout cross-check (the coach-building cases). Pinned week bar removes A's only weakness. See scorecard. |
| Width on mobile | **Indent once, accent rule, never stack padding** | Cumulative per-level indentation squeezes set fields to ~55% width. One 10px indent + 2px accent rule keeps full width. |
| Exercise selection | **Keyboard-aware search sheet**, multi-select, filters, `tracking_type` badges, create-custom | A library with search + muscle/equipment filters can't be an inline autocomplete. |
| Set value editing | **Bottom sheet docked above the keyboard** (popover on desktop) | A set has several outputs (reps, load, unit, RPE, set_type). When the keypad is open ~40% of height is gone; a docked sheet keeps fields visible. Fields shown are driven by `tracking_type`. |
| Persistence | **Autosave per action** | Matches the existing nutrition day-planner; the granular training API (POST workout / exercise, PATCH set) maps 1:1. |

### Why A over B (rejected alternative)

B (cards + bottom-sheet editor) was the runner-up. Case-by-case verdict
(`assets/.../02-a-vs-b-scorecard.html`):

1. Deep edit (5 exercises, editor open) — *slight B* (focus).
2. Scan whole plan — **A** (collapse-all → real outline; B shows only chips).
3. Cross-check two workouts — **A** (both expandable; B forces close/open).
4. Schedule while building — *tie* (A's pinned week bar; B's always-visible week).
5. Reorder exercises — *tie*.

Tally A 2 / B 1 / ties 2. This is a *builder* — composing and eyeballing a whole
template — so A's continuous overview beats B's single-workout focus.

## Page anatomy

Top to bottom, one vertical scroll surface:

```
┌────────────────────────────┐
│ Hypertrophy Block      ✎   │  ← plan header (name, dates; tap to edit)
├────────────────────────────┤
│ Week ▸ Mon Push·Tue Rest…  │  ← PINNED week bar (sticky top), tap to expand
├────────────────────────────┤
│ WORKOUTS                   │
│ ┌ Push Day          5 · ▾ ┐│  ← workout accordion (expanded)
│ │ ┃ Bench Press          ││  ← exercise (2px accent rule, single indent)
│ │ ┃  working·set1  ⋯      ││  ← set row → tap opens set sheet
│ │ ┃  [REPS 8][KG 100][RPE]││
│ │ ┃  + set                ││
│ │ ┃ Incline DB Press      ││
│ │ + Add exercise          ││
│ └─────────────────────────┘│
│ ┌ Pull Day          3 · ▸ ┐│  ← collapsed
│ + Add workout              │
├────────────────────────────┤
│ WEEK                       │  ← schedule = assignment + read-only day view
│ Mon  Push Day        ▾     │
│ Tue  Rest            ▾     │
│ Wed  Pull Day        ▾  ▸  │  ← expand a day → read-only exercise list
│ …                          │
└────────────────────────────┘
```

The pinned week bar (top) is the quick scheduler; the full WEEK section (bottom)
is the same data expanded with per-day read-only previews. Collapse-all on the
WORKOUTS header turns the plan into a scannable outline.

## Components

### Plan header
Name + start/end dates. Tap to edit inline. Creating a plan creates the shell on
first save of the name; the builder then operates on a real plan id.

### Workout accordion
- Card per workout. Header: name + exercise count + expand chevron.
- One workout expanded at a time (accordion) to manage height.
- `+ Add workout` appends a new named workout.
- WORKOUTS header has **collapse-all** → outline mode (case 2).

### Exercise row (width discipline)
Single 10px indent + a 2px accent rule marks the exercise group. **No further
indentation** for sets or the field display. Depth reads from weight, dividers,
and the accent rule — never stacked padding.

```
TRAP (rejected)                 FIX (rule)
plan ▸ card ▸ ex ▸ set ▸ editor   ┃ Bench Press
each level pads → ~55% width      ┃  set fields span FULL card width
```

See `assets/.../03-width-discipline.html`.

### Set rows + set value sheet
- Each physical set is its own row (matches schema: one row per set).
- A set row shows a compact summary (`working · 3×8 · 100kg`).
- Tapping a set (or `+ set`) opens the **set value sheet**, docked directly above
  the keyboard:

```
┌──────────────────────────┐
│ Bench Press · Set 1  Done│
│ [Working] Warm-up  Drop  │  ← set_type: taps, not typing
│ [REPS 8][WEIGHT 100][RPE]│  ← only tracking_type fields; active field hi-lit
│           kg|lb          │  ← unit: tap toggle
│ + rest timer · notes     │  ← advanced, disclosed
├──────────────────────────┤
│  1  2  3   numeric keypad│  ← sheet sits exactly on top of keypad
│  4  5  6                 │
│  7  8  9                 │
│  .  0  ⌫                 │
└──────────────────────────┘
```

- **Fields shown are driven by the exercise's `tracking_type`**: `weight_reps` →
  reps + weight + rpe; `duration` (plank) → duration only; `distance_duration`
  (row) → distance + duration; etc. (Full mapping in the schema spec.)
- `set_type` and unit (kg/lb/bodyweight) are taps. Numbers use the keypad.
- Advanced (rest timer, notes) behind a disclosure.
- Desktop equivalent: a **popover** anchored to the set row.
- Enhancement: swipe to the next/previous set without closing the sheet.

See `assets/.../04-picker-and-set-sheet.html`.

### Exercise picker sheet
Triggered by `+ Add exercise`. Keyboard-aware search sheet:

```
┌──────────────────────────┐
│ Add exercises          ✕ │
│ [ search: "chest"      ] │
│ (Chest)(Back)(Legs)(DB)… │  ← muscle / equipment filter chips, scrollable
│ ☑ Bench Press   Chest·BB │  wt+reps
│ ☑ Incline DB    Chest·DB │  wt+reps
│ ☐ Push-up   Chest·BW     │  reps
│ ☐ Cable Fly  Chest·Cable │  wt+reps
├──────────────────────────┤
│   [ Add 2 exercises ]    │  ← dock floats above keyboard while searching
└──────────────────────────┘
```

- Search + muscle/equipment filter chips + `tracking_type` badge per row.
- **Multi-select**: pick several, one `Add N` drops them inline into the workout.
- No-match search shows a `+ Create "<query>"` row → custom exercise (`source:
  custom`).
- The `Add` bar floats just above the keyboard while the search field is focused.

### Week section (schedule + read-only day view)
- 7 rows, one per weekday. Each row picks a workout (or Rest) via a dropdown that
  lists the plan's workouts.
- A day with no assignment is Rest (no schedule entry).
- An assigned day expands **read-only** to show that workout's exercises — this is
  the day-first projection; no editing here.
- The pinned top week bar is the condensed version of this section.

## Interactions

- **Autosave** per action: name edit → create/patch plan; add workout → POST
  workout; add exercise → POST workout-exercise (with its `planned_sets`); edit
  set → PATCH; assign day → PUT schedule/:day. No explicit save button.
- **Empty states**: no workouts → "Add your first workout"; workout with no
  exercises → "Add exercises"; week with unassigned days → days read Rest.
- **One active accordion** keeps the page height bounded; collapse-all for
  overview.

## API mapping

| Action | Endpoint (training API spec) |
|---|---|
| Create / rename plan | `POST` / `PATCH /v1/coach/training-plans` |
| Add / rename workout | `POST /v1/coach/training-plans/:plan_id/training-workouts`, `PATCH /v1/coach/training-workouts/:id` |
| Add exercise to workout (+ planned_sets) | `POST /v1/coach/training-workouts/:workout_id/exercises` |
| Edit / remove a set | `PATCH` / `DELETE /v1/coach/training-workout-exercises/:id` (sets embedded) |
| Search exercise library | `GET /v1/coach/training-exercises` (search, muscle, equipment filters) |
| Create custom exercise | `POST /v1/coach/training-exercises` |
| Assign workout to a day | `PUT /v1/coach/training-plans/:plan_id/schedule/:day` |
| Filter chips source | `GET /v1/coach/training-muscles`, `GET /v1/coach/training-equipment` |

## Visual references

Preserved mockups (open in a browser; best via the visual companion):

- `assets/training-plan-builder/01-layout-options.html` — A / B / C structures
- `assets/training-plan-builder/02-a-vs-b-scorecard.html` — five-case A-vs-B decision
- `assets/training-plan-builder/03-width-discipline.html` — nesting trap vs fix
- `assets/training-plan-builder/04-picker-and-set-sheet.html` — picker + set sheet

## Out of scope

- Day-first editing (day view is read-only)
- Layout B (bottom-sheet workout editor) — rejected
- Progression/PR surfacing in the builder (separate; see schema spec out-of-scope)
- Client/logging UI (this spec is the coach builder only)
- Drag-reorder polish beyond basic exercise reordering
</content>
