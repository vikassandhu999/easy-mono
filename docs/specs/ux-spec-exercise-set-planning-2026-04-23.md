# UX Spec: Exercise Set Planning (Simplified, v3)

**Date:** 2026-04-23
**Supersedes:** `ux-spec-exercise-set-planning.md` and `spec-addendum-set-planning-v2.md`
**Principle:** One target per exercise. Inline. Minimal copy. 5 taps for the 95% case.

---

## What Changed From v2

Three decisions tighten the feature:

1. **No per-set configuration.** Every set in an exercise shares the same target. The per-set mode toggle, warmup sets, and `set_type` enum are all removed. If a coach wants a pyramid or a warmup set, they describe it in the exercise notes.
2. **Inline add-exercise.** The form appears in place within the day's workout — not a separate screen or drawer. Matches the pattern that existed before the over-engineered full-page version.
3. **Minimal copy.** Labels are the field name. No subtitles, no hints, no "last time" callouts, no "Same across all N sets" toggle text. The UI communicates through structure, not prose.

The storage model is unchanged. Backend still receives an array of N identical `planned_sets`. Nothing downstream has to care that the coach's mental model is "one target."

---

## Storage Model (Unchanged)

`WorkoutElement` still has `embeds_many :planned_sets`. A "4 × 8-12 @ 80kg, rest 90s" exercise sends:

```json
"planned_sets": [
  { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
  { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
  { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
  { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 }
]
```

Four identical structs. Per-set storage stays because the **client logging** needs it — each PerformedSet maps to one PlannedSet. The coach just never sees individual sets.

### Schema changes

Delete the `set_type` field from `PlannedSet`:

```elixir
# Remove from PlannedSet schema
field :set_type, Ecto.Enum, values: [:warmup, :working, :dropset, :backoff, :amrap, :emom, :cluster, :rest_pause]
```

The field is gone. No migration needed if the column doesn't exist in the DB yet — `embeds_many` stores JSON. If `set_type` values are already persisted in existing records, they're harmlessly ignored on read (embedded_schema rejects unknown keys silently).

If there are production records with `set_type` values already, add a one-time script to strip the field from existing planned_sets JSON. Otherwise: leave it, Ecto will ignore it.

---

## The Inline Add-Exercise Flow

### Entry point

On the day's workout page, at the bottom of the exercise list:

```
┌──────────────────────────────────────────────────┐
│  Push Day · Monday                               │
│                                                  │
│  1. Barbell Bench Press                          │
│     4 × 8-12 @ 80kg · rest 90s                   │
│                                                  │
│  2. Overhead Press                               │
│     3 × 10 @ 50kg · rest 60s                     │
│                                                  │
│  [+ Add exercise]                                │
└──────────────────────────────────────────────────┘
```

Tapping `+ Add exercise` replaces the button with an inline form, in place, at the bottom of the list. The coach never leaves the workout page.

### The inline form

After the coach picks an exercise from the picker (same picker as before), the form appears:

```
┌──────────────────────────────────────────────────┐
│  Push Day · Monday                               │
│                                                  │
│  1. Barbell Bench Press                          │
│     4 × 8-12 @ 80kg · rest 90s                   │
│                                                  │
│  2. Overhead Press                               │
│     3 × 10 @ 50kg · rest 60s                     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Incline Dumbbell Press                     │  │
│  │                                            │  │
│  │ [3×10] [4×8-12] [5×5] [3×15]               │  │
│  │                                            │  │
│  │ Sets       Reps                            │  │
│  │ [4  ]      [8-12]                          │  │
│  │                                            │  │
│  │ Load           Rest                        │  │
│  │ [80 kg]        [90 sec]                    │  │
│  │                                            │  │
│  │ Notes (optional)                           │  │
│  │ [                                ]         │  │
│  │                                            │  │
│  │ [Cancel]              [Add]                │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

The exercise name (from the picker) heads the form. No "compound · chest, triceps" subtitle. The coach knows what exercise they just picked.

### Elements, top to bottom

**Quick scheme chips (row of 4):**
- `3×10`, `4×8-12`, `5×5`, `3×15`
- Each fills Sets + Reps in one tap
- Selected chip shows the blue filled state (see mockup)
- Tapping a chip:
  - Fills Sets and Reps inputs with the scheme values
  - Pre-fills Rest based on the rep range (see "Rest defaults" below)
  - Moves focus to the Load input, keyboard opens

**Sets and Reps (2×2 grid row 1):**
- Sets: `inputmode="numeric"`, centered, default 4
- Reps: `inputmode="text"` (allows "8-12" with hyphen), centered, default "8-12"
- Both 48px tall
- Editing either input deselects the chip

**Load and Rest (2×2 grid row 2):**
- Load: value input + unit pill on the right (`kg` / `lbs` / `bw`)
- Rest: value input + unit pill (`sec` / `min`)
- Both 48px tall
- Load is empty by default. Coach must type.
- Rest has a smart default (see below) but is editable.

**Notes (optional, textarea):**
- Placeholder: `Notes (optional)`
- Single line until focused, expands on focus
- Used for anything exotic the coach wants the client to know — "warm up to working weight," "pyramid down each set," "focus on the eccentric."

**Actions:**
- Cancel: discards the form, returns to `[+ Add exercise]` button
- Add: primary, 48px tall, submits and adds the exercise to the list

No "Advanced" section. If the coach wants tempo or RPE, they write it in notes. The schema fields stay for backend compatibility, but the UI doesn't expose them.

---

## Smart Defaults

### Sets and Reps
- Default chip selected: `4×8-12` (the most common scheme in the competitor sample)
- Form opens with Sets=4, Reps=8-12 pre-filled

### Load
- No pre-fill. The coach knows what they want the client to lift.
- No "Last time: 80kg" hint for MVP. Shows post-MVP when we have historical data worth showing.

### Rest
- Derived from reps on chip tap or reps blur:
  - Reps ≤ 6: **120 sec**
  - Reps 7-12: **90 sec**
  - Reps 13+: **60 sec**
- Editable. The default fires only when the Rest field is empty.

### Load unit
- Inherits from business settings (kg for India).
- Persists across exercises in the same session — if the coach changes to lbs once, future exercises default to lbs.

---

## Mobile Layout

### Default (≥360px width)

Two-column grid. Sets + Reps on one row, Load + Rest on the next. Comfortable on any modern phone including the iPhone SE (375px) and standard Android (360px+).

### Narrow fallback (<360px)

On very narrow viewports (older iPhones, cheap Androids), the 2-column grid compresses the Load input below readability. Breakpoint at 360px:

- Sets + Reps: stay 2-column (numeric values fit comfortably in ~120px each)
- Load: full-width row
- Rest: full-width row

This costs ~80px of vertical space but prevents inputs from overflowing or truncating "82.5" to "82.". Worth the scroll.

Implementation: use a CSS container query or viewport-based media query. Tailwind: `grid-cols-1 min-[360px]:grid-cols-2` on the load/rest row.

### Input sizes

All text inputs: **48px tall** (HeroUI `lg` size). Set via theme override, not per-component.

Unit pills embedded in the Load/Rest inputs: tap target is the full input height (48px), not just the pill area. Tapping anywhere on the input opens the keyboard; tapping the pill specifically opens the unit picker bottom sheet.

Quick scheme chips: 40px tall (smaller than inputs — they're secondary actions, and tighter packing lets 4 fit comfortably on 320px width).

Cancel button: 44px. Add button: 48px (primary action gets the extra height).

### Vertical rhythm

- 14px padding around the form card
- 10-12px gap between field rows
- 14px space between form sections (chips → grid → notes → actions)
- Form card itself: `border: 0.5px solid`, `border-radius: 12px`, same style as the exercise cards above it (visual continuity — it's the new exercise being composed)

---

## Editing an Existing Exercise

Tapping an existing exercise in the list replaces its row with the same inline form, pre-filled with the exercise's current values. Same card style, same inputs, same chip row.

The form title becomes the exercise name (unchanged) with a small "Editing" label. Actions become `[Cancel]` and `[Save]`.

**Same layout, same controls, no mode difference.** The coach who knows how to add an exercise knows how to edit one. No learning curve.

When editing, the chip row highlights the matching chip if the current Sets/Reps match one (e.g., 4 sets at 8-12 → `4×8-12` chip shown as selected). If the values don't match any chip, no chip is selected.

---

## Desktop Layout

At ≥1024px width, the inline form spreads:

```
┌───────────────────────────────────────────────────────────────┐
│  Incline Dumbbell Press                                       │
│                                                               │
│  [3×10] [4×8-12] [5×5] [3×15]                                │
│                                                               │
│  Sets    Reps    Load          Rest         Notes             │
│  [4]     [8-12]  [80 kg]       [90 sec]     [            ]   │
│                                                               │
│  [Cancel]                                          [Add]      │
└───────────────────────────────────────────────────────────────┘
```

Single-row input strip at desktop, 2×2 grid on mobile. Notes input becomes narrower (one-line until focused). Same chips, same defaults, same behavior.

Input height on desktop: 40px (HeroUI `md`). Desktop doesn't need thumb-zone targets.

Hover affordances: exercises in the list show action buttons (edit, duplicate, delete) on hover. No 3-dot menu. Desktop users expect hover.

---

## Payload Contract

### Create

```
POST /v1/coach/workout_elements
{
  "workout_id": "...",
  "exercise_id": "...",
  "position": 3,
  "notes": "Focus on slow negatives",
  "planned_sets": [
    { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
    { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
    { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 },
    { "target_reps": "8-12", "load_value": 80, "load_unit": "kg", "rest_seconds": 90 }
  ]
}
```

- N identical entries, where N = Sets value
- No `set_type` field — dropped
- All entries are identical because per-set variation is not supported

### Update

Same shape. Update replaces the `planned_sets` array entirely. If the coach changes Sets from 4 to 3, the array goes from 4 entries to 3 entries. If they change load from 80 to 85, all 4 entries update to 85.

### Validation (backend)

- `planned_sets` must have length ≥ 1 (reject empty arrays)
- `load_value` must be > 0 or null (null for bodyweight exercises)
- `load_unit` required if `load_value` is set
- `target_reps` required, follows existing format validation
- `rest_seconds` must be ≥ 0
- Soft warnings belong to the frontend (reps > 50, load > 300kg)

---

## Copy Reference

All user-facing text in the form:

| Element | Text |
|---------|------|
| Form header (editing) | `Editing` |
| Quick scheme chips | `3×10` `4×8-12` `5×5` `3×15` |
| Field labels | `Sets`, `Reps`, `Load`, `Rest`, `Notes (optional)` |
| Input unit pills | `kg` / `lbs` / `bw` / `sec` / `min` |
| Cancel button | `Cancel` |
| Primary action button | `Add` (new) or `Save` (editing) |
| Validation errors | `Required` (empty field) |
| Unit picker sheet header | `Load unit` / `Rest unit` |
| Unit picker options | `Kilograms (kg)` / `Pounds (lbs)` / `Bodyweight` / `Seconds` / `Minutes` |

No subtitles, no descriptions, no hints, no "Last time: X kg" callouts, no "Same across all N sets" text, no "Advanced (tempo, notes)" accordion, no "Compound · Chest, triceps" exercise metadata line.

---

## What's Removed From v2

- Per-set mode toggle
- `set_type` enum and warmup set support
- Warmup badge (yellow W)
- Bulk edit (sheet or multi-select)
- "Different per set" expansion
- "Same across all N sets" segmented toggle
- Advanced fields accordion (tempo, intensity, duration, distance)
- "Last time: X kg" hint under Load
- Exercise metadata subtitle
- Full-page add-exercise layout

Everything coaches could do with these is expressible in the `notes` field. If the spec is wrong and coaches actually need per-set variation, we'll see it in usage and add it back — but based on the competitor data, they won't.

---

## Client App Impact

The client app still receives N PlannedSet structs and shows N rows to log. Since all structs are identical, the client's view is the one from the existing spec:

```
Barbell Bench Press                        In progress
  Set 1   10 @ 80kg   [10] [80]   ✓
  Set 2   10 @ 80kg   [  ] [  ]   ○
  Set 3   10 @ 80kg   [  ] [  ]   ○
  Set 4   10 @ 80kg   [  ] [  ]   ○
```

No warmup handling needed on the client either. If the coach wrote "warm up to working weight" in notes, the client reads it at the top of the exercise and does their own warmup (which isn't logged — warmups aren't data).

### What this means for the client spec

The `ux-spec-client-active-workout.md` spec has a section on warmup set visual distinction that's now dead code. Can be removed in the next pass.

---

## Success Metrics

**95% case tap count:** 5 taps maximum.

1. Tap `+ Add exercise`
2. Pick exercise from picker
3. Tap a quick scheme chip (e.g., `4×8-12`) — auto-focuses Load
4. Type load (e.g., "80")
5. Tap Add

Rest is defaulted from the rep scheme. Unit is defaulted from business settings. Position is auto-assigned. Sets/Reps filled by the chip.

**Custom scheme case:** 7 taps.

1. Tap `+ Add exercise`
2. Pick exercise
3. Tap Sets field, type value
4. Tap Reps field, type value
5. Tap Load, type value
6. Tap Rest (if not defaulted)
7. Tap Add

**QA target:** Measure these tap counts in the post-implementation QA. If the 95% case exceeds 6, the implementation has regressed and needs rework before shipping.

---

## Open Question (Minor)

Quick scheme chips are fixed at 4 presets. Some coaches might program around different schemes (e.g., 4×6 for strength). For MVP ship the fixed four — they cover 95% per competitor data. Post-MVP, add a Settings option "Customize quick schemes" if coaches ask.

---

## Implementation Checklist

### Frontend

1. Remove per-set mode toggle and all related state/UI
2. Remove warmup set UI (add-warmup button, warmup badge, W set number)
3. Remove bulk-edit sheet
4. Remove Advanced fields accordion
5. Remove exercise metadata subtitle
6. Remove "Same across all sets" toggle
7. Remove "Last time: X" hint
8. Inline the add-exercise form in the workout page (not a separate screen/drawer)
9. Add quick scheme chips as primary input
10. Implement chip → Load auto-focus
11. Implement rest smart defaults by rep range
12. Implement 48px input height as theme default (HeroUI `size="lg"`)
13. Implement 360px breakpoint for vertical stack fallback
14. Desktop: single-row input strip at ≥1024px
15. Desktop: hover action buttons on exercise rows

### Backend

1. Remove `set_type` field from `PlannedSet` schema
2. Remove `set_type` from `@cast_fields`
3. Remove any `set_type` references in `WorkoutElement` JSON view
4. Add `validate_length(:planned_sets, min: 1)` on `WorkoutElement` changeset (or equivalent list-length guard)
5. Add `validate_number(:load_value, greater_than: 0)` on `PlannedSet` changeset where load is set
6. Optional: write a one-time cleanup script to strip `set_type` from existing persisted records
