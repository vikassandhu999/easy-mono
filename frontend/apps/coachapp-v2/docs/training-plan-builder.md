# UX Spec: Training Plan Builder + Training Logging (Updated)

**Date:** 2026-03-25
**Verified against:** Backend schemas (`training_plan.ex`, `planned_workout.ex`, `workout_element.ex`, `planned_set.ex`, `workout_session.ex`, `performed_set.ex`, `exercise.ex`), controllers, JSON views, frontend `trainingPlans.ts`, `exercises.ts`
**Status:** Previous spec was pre-implementation. This spec is post-implementation — aligned with actual backend schema, with schema critique and client-side logging added.

---

## PART 1: Schema Critique & Recommendations

### What's Well Built

The backend schema is solid in several areas:

- **PlannedSet as embedded schema** — correct decision. Sets are part of the element, not independent entities. `on_replace: :delete` means updating the array replaces cleanly.
- **Validation depth** — `validate_has_target` on PlannedSet ensures every set has at least reps, duration, or distance. `validate_target_reps_format` accepts "8", "8-12", "10,8,6", "AMRAP", "Max", "Failure". Comprehensive.
- **WorkoutSession state machine** — active → completed/discarded is clean. `complete/2` auto-sets `ended_at`. `discard/1` is a soft-delete.
- **PerformedSet flexibility** — `actual_reps` (string, like target_reps), `rpe`, `rir`, `intensity_felt`, `tempo_actual`, `completed` boolean. Very rich logging model.
- **Duplicate/assign transactions** — `TrainingPlan.duplicate/1` and `assign_to_client/4` deep-copy workouts + elements + sets in a transaction. Correct.
- **Position unique constraint** — Prevents position collisions within a workout (elements) and within a session (performed sets).

### Issues Found

#### 🔴 Issue 1: `day_number` constrained to 1-7 (weekdays)

```elixir
# planned_workout.ex
validate_number(:day_number, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
```

Plus a `day_name/1` function mapping 1=Monday through 7=Sunday.

**Impact on the builder:** Our original spec designed the builder around sequential day numbers (Day 1, Day 2, Day 3...) for arbitrary-length programs. The actual backend uses weekday assignment — a workout is assigned to Monday (1), Tuesday (2), etc.

**This is actually fine for Indian fitness coaching.** Coaches assign workouts to specific weekdays: "Push on Monday/Thursday, Pull on Tuesday/Friday, Legs on Wednesday/Saturday." A weekly cycle is the natural model. The builder should show Mon–Sun tabs (like the nutrition plan day planner), not "Day 1, Day 2, Day 3."

**UX implication:** The builder uses weekday tabs, and multiple workouts can share the same day_number (e.g., morning cardio + evening strength both on Monday). The spec is updated below.

#### 🔴 Issue 2: `PerformedSet` has no link to `WorkoutElement`

```elixir
# performed_set.ex — no workout_element_id field
belongs_to :workout_session, WorkoutSession
belongs_to :exercise, Exercise
```

A performed set links to the session and the exercise, but NOT to the specific workout element (exercise slot) in the plan. This breaks when:

- **Same exercise appears twice** in a workout (e.g., Bench Press as the main lift at exercise #1 AND Bench Press as a burnout finisher at exercise #5). All performed sets would share the same `exercise_id` — impossible to distinguish which planned slot they belong to.
- **Planned-vs-actual comparison** becomes exercise-level only, not slot-level. The coach can't see "how did set 3 of your first bench press compare to the plan?" — only "how did all your bench press sets compare?"

**Recommendation:** Add `workout_element_id` (nullable) to `PerformedSet`.

```elixir
# Proposed addition to performed_set.ex
belongs_to :workout_element, WorkoutElement  # nullable — null for freestyle exercises
```

When the client logs against a planned workout, each performed set links to the specific workout element. When the client adds a freestyle exercise (not in the plan), `workout_element_id` is null. This enables precise planned-vs-actual comparison per exercise slot.

**Migration:** Add nullable `workout_element_id` column + FK constraint. No data migration needed (existing performed_sets get null, which is valid).

#### 🟡 Issue 3: `PlannedSet` has no primary key or index

```elixir
# planned_set.ex
@primary_key false
embedded_schema do
```

This is correct for an embedded schema — sets don't need individual identifiers on the backend since they're replaced as an array. But it means the frontend can't reference a specific planned set by ID (e.g., "the 3rd set of this element"). The frontend must use array index, which is fine but fragile if sets are reordered.

**No change needed.** Array index works. The frontend already treats `planned_sets` as an ordered array.

#### 🟡 Issue 4: `position` on PerformedSet is globally unique per session

```elixir
# performed_set.ex
unique_constraint([:workout_session_id, :position])
```

This means position is a global counter across ALL exercises in the session, not per-exercise. Set 1 might be Bench Press, set 2 might be Bench Press, set 3 might be Overhead Press. This is a flat list.

**Impact:** The client app must auto-increment position across all exercises in the session, not reset per exercise. When logging Bench Press set 1 (position=0), Bench Press set 2 (position=1), then Overhead Press set 1 (position=2).

**This is actually fine.** The `exercise_id` groups sets by exercise on read. Position just determines the chronological order. The client app manages this automatically — the user never sees position numbers.

#### 🟢 Good: WorkoutSession.planned_workout_id is optional

```elixir
# workout_session.ex — not in validate_required
validate_required([:state, :started_at, :client_id, :business_id])
```

`planned_workout_id` is NOT required. This means clients can log freestyle workouts without a plan. This is important — a client might do an unplanned gym session, or train while between programs. The logging UI should support both planned and freestyle workouts.

---

## PART 2: Training Plan Builder (Coach Side — Updated)

### Key Change: Weekday Tabs, Not Sequential Days

The builder uses weekday assignment (Mon–Sun) because `day_number` is constrained to 1–7. This aligns with how Indian coaches actually schedule: "Push on Monday and Thursday, Pull on Tuesday and Friday."

### Screen Architecture (unchanged from original spec)

| File | Route | Purpose |
|------|-------|---------|
| `list-training-plans.tsx` | `/library/training-plans` | Infinite scroll list + search |
| `create-training-plan.tsx` | `/library/training-plans/create` | Plan metadata form |
| `training-plan-detail.tsx` | `/library/training-plans/:id` | Builder + overview |
| `edit-training-plan.tsx` | `/library/training-plans/:id/edit` | Edit metadata |

### Builder Page Layout

```
Training Plan

← Back  ✏️ Edit  📋 Copy to Client  📋 Duplicate  🗑 Delete

Push Pull Legs
A 3-day push/pull/legs split.
┌Active┐ ┌template┐

═══════════════════════════════════════════════════

[Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]
  ↑ weekday tabs — same pattern as nutrition plan day planner

─── MONDAY ──────────────────────────────────────

┌──────────────────────────────────────────────────┐
│ Push Day                                   🖉  🗑│
│                                                  │
│  Barbell Bench Press    4 × 8-10 @ 80kg   120s ✕│
│  Overhead Press         3 × 10 @ 50kg      90s ✕│
│  Incline DB Press       3 × 12 @ 30kg      60s ✕│
│  Lateral Raises         3 × 15 @ 10kg      45s ✕│
│  Tricep Pushdowns       3 × 12 @ 25kg      45s ✕│
│                                                  │
│  [ 🔍 Add exercise...                      🔽 ] │
└──────────────────────────────────────────────────┘

[+ Add Workout to Monday]

─── No workouts on TUESDAY ────────────────────────

[+ Add Workout to Tuesday]

─── WEDNESDAY ────────────────────────────────────

┌──────────────────────────────────────────────────┐
│ Pull Day                                   🖉  🗑│
│ (exercises...)                                   │
└──────────────────────────────────────────────────┘
```

**Alternative: no tabs, single scroll**

If the plan only uses 3 days (Mon/Wed/Fri), showing 7 tabs with 4 empty is wasteful. Alternative: show all days as sections in a single scroll, hiding empty days by default with a "+ Add workout" for each.

```
MONDAY
┌ Push Day ─────────────────────────────────────┐
│ (exercises...)                                 │
└────────────────────────────────────────────────┘

WEDNESDAY
┌ Pull Day ─────────────────────────────────────┐
│ (exercises...)                                 │
└────────────────────────────────────────────────┘

FRIDAY
┌ Legs ─────────────────────────────────────────┐
│ (exercises...)                                 │
└────────────────────────────────────────────────┘

Other days: [+ Mon] [+ Tue] [+ Thu] [+ Sat] [+ Sun]
                              ↑ buttons to add workouts to empty days
```

**Recommendation:** Single scroll for templates (coach sees the whole plan at once — the overview mode from our spec). Weekday tabs for the detail/edit view if the plan is dense (6-7 days). Start with single scroll — it's simpler and matches the "overview in one scroll" principle from our original spec.

### Add Exercise Flow (unchanged from original spec)

After selecting an exercise from the picker, the set scheme input appears:

```
🏋️ Barbell Bench Press

Sets   Reps      Load         Rest
[4  ]  [8-10  ]  [80 ] [kg🔽] [120 ]

[+ Add exercise]   [Customize per set]
```

One tap creates the element with N identical working sets. API call:

```
POST /v1/coach/workout_elements
{
  planned_workout_id: "...",
  exercise_id: "...",
  position: next_position,
  planned_sets: [
    { set_type: "working", target_reps: "8-10", load_value: 80, load_unit: "kg", rest_seconds: 120 },
    { set_type: "working", target_reps: "8-10", load_value: 80, load_unit: "kg", rest_seconds: 120 },
    { set_type: "working", target_reps: "8-10", load_value: 80, load_unit: "kg", rest_seconds: 120 },
    { set_type: "working", target_reps: "8-10", load_value: 80, load_unit: "kg", rest_seconds: 120 }
  ]
}
```

### Add Workout Flow

```
[+ Add Workout to Monday]

     ↓ tap

┌──────────────────────────────────────────────────┐
│ Workout name                                     │
│ [Push Day             ]                          │
│                                                  │
│ [Add]  [Cancel]                                  │
└──────────────────────────────────────────────────┘
```

API call: `POST /v1/coach/training_plans/:plan_id/planned_workouts { name: "Push Day", day_number: 1 }`

The `day_number` is determined by which day's section the button is in. The coach doesn't pick the day — the context does.

### Everything else from the original spec remains

- Set scheme summary format (overview mode)
- Per-set detail editor for mixed set types
- Exercise element expand/collapse
- Copy workout (duplicate endpoint)
- Copy exercise across workouts
- Exercise removal with undo toast
- Renew/shift dates on copy-to-client
- Same implementation phases

### Frontend API layer: what needs adding

The existing `trainingPlans.ts` has all CRUD mutations. What's missing:

```typescript
// Add to trainingPlans.ts — WorkoutSession types and endpoints

export type PerformedSet = {
  id: string;
  position: number;
  actual_reps: null | string;
  load_value: null | number;
  load_unit: 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe';
  intensity_felt: null | string;
  rpe: null | number;
  rir: null | number;
  duration_seconds: null | number;
  distance_value: null | number;
  distance_unit: 'km' | 'meters' | 'miles' | 'none' | 'yards';
  tempo_actual: null | string;
  completed: boolean;
  notes: null | string;
  exercise_id: string;
  exercise?: null | { id: string; name: string };
  workout_element_id?: null | string;        // proposed addition
  workout_session_id: string;
  inserted_at: string;
  updated_at: string;
};

export type WorkoutSession = {
  id: string;
  started_at: string;
  ended_at: null | string;
  state: 'active' | 'completed' | 'discarded';
  soreness_rating: null | number;
  notes: null | string;
  client_id: string;
  business_id: string;
  planned_workout_id: null | string;
  performed_sets: PerformedSet[];
  inserted_at: string;
  updated_at: string;
};
```

---

## PART 3: Training Logging (Client Side)

### Real-World Scenarios

### Design mindset: "Log reality, compare to plan"

The plan is **guidance, not a mandate.** The client's job is to train and record what they actually did. The app's job is to make that recording effortless. Deviations from the plan — swapping exercises, adjusting load, skipping a set — are **normal and expected**, not errors. The UX must treat them as first-class outcomes, not warnings.

This means: no red "didn't follow plan" indicators. No blocking progression for skipped exercises. No guilt-inducing copy. The comparison is for the coach's analysis, not the client's judgment.

### Real-world gym scenarios

Before designing any UI, here's what actually happens:

**Scenario 1: Following the plan exactly** (70% case)
Vikas opens the app → sees "Monday: Push Day" → does Bench Press exactly as prescribed (4×8-10 @80kg) → logs each set → moves to next exercise.

**Scenario 2: Adjusting load or reps**
Plan says 80kg. Vikas feels strong and does 85kg. Or he's fatigued and drops to 75kg on the last set. Same exercise, different numbers.

**Scenario 3: Replacing an exercise** (most common deviation)
Bench press station is occupied. Vikas swaps Barbell Bench Press for Dumbbell Bench Press. He wants to keep the same set/rep scheme but with a different exercise. The coach should see "Vikas replaced Barbell Bench with DB Bench" — not "Vikas skipped Barbell Bench" + "Vikas added DB Bench."

**Scenario 4: Skipping an exercise**
The cable machine is broken and there's no alternative. Vikas skips Lateral Raises entirely and moves on.

**Scenario 5: Adding an unplanned exercise**
Vikas finishes the plan but has energy left. He adds 3 sets of face pulls that aren't in the plan.

**Scenario 6: Failing a set**
Plan says 4×8-10. Vikas does 10, 9, 8, 6 (failed on the last set). Each set has different actual reps. This isn't an error — it's valuable data for the coach.

**Scenario 7: Freestyle workout (no plan)**
Vikas is traveling, no gym with proper equipment. He does a bodyweight workout not tied to any plan.

**Scenario 8: Repeating a different day's workout**
Plan says Push Day on Monday only, but Vikas wants to redo it on Thursday. He should be able to log against any planned workout regardless of which weekday it is.

### Client App: Workout Logging Flow

#### Starting a workout

```
HOME SCREEN

Today: Monday

┌──────────────────────────────────────────────────┐
│ 🏋️ Push Day                                      │
│    5 exercises · ~60 min                         │
│                                                  │
│    [▶ Start workout]                              │
└──────────────────────────────────────────────────┘

Other workouts in your plan:
  Wed: Pull Day · 5 exercises
  Fri: Legs · 5 exercises

[+ Freestyle workout]       ← no plan, just log
```

**"Today" determination:** Match `Date.today()`'s weekday (1=Mon through 7=Sun) against `planned_workout.day_number` in the client's assigned training plan. If multiple workouts share the same day_number, show all.

**"Start workout" action:** `POST /v1/coach/workout_sessions { client_id, planned_workout_id, state: "active" }`. The server sets `started_at: DateTime.utc_now()`. The session is now "active."

**"Freestyle workout":** Same POST but without `planned_workout_id`. The client gets an empty session and adds exercises manually.

#### Active workout screen

The client sees their planned exercises with the coach's prescribed sets. They log actual performance as they train. The plan is guidance — the client is in control.

```
ACTIVE WORKOUT · Push Day                    [⏱ 32:14]

═══════════════════════════════════════════════════

Barbell Bench Press                        ✓ Done
┌────┬──────────┬──────────┬───────────────────────┐
│ #  │ Plan     │ Done     │ Load                  │
├────┼──────────┼──────────┼───────────────────────┤
│ 1  │ 8-10     │ 10       │ 80 kg          ✓      │
│ 2  │ 8-10     │ 9        │ 80 kg          ✓      │
│ 3  │ 8-10     │ 8        │ 80 kg          ✓      │
│ 4  │ 8-10     │ 6        │ 75 kg          ✓      │
└────┴──────────┴──────────┴───────────────────────┘

═══════════════════════════════════════════════════

Overhead Press              [🔄 Replace] [⏭ Skip]  ← action buttons
┌────┬──────────┬──────────┬───────────────────────┐
│ #  │ Plan     │ Done     │ Load                  │
├────┼──────────┼──────────┼───────────────────────┤
│ 1  │ 10       │ [    ]   │ [50  ] kg    ○        │
│ 2  │ 10       │ [    ]   │ [50  ] kg    ○        │
│ 3  │ 10       │ [    ]   │ [50  ] kg    ○        │
└────┴──────────┴──────────┴───────────────────────┘

═══════════════════════════════════════════════════

Incline DB Press              [🔄] [⏭]   Not started
  3 × 12 @ 30kg

Lateral Raises                [🔄] [⏭]   Not started
  3 × 15 @ 10kg

Tricep Pushdowns              [🔄] [⏭]   Not started
  3 × 12 @ 25kg

═══════════════════════════════════════════════════

[+ Add exercise]                    [Finish workout]
```

**Column headers:** "Plan" and "Done" — not "Target" and "Actual." This framing treats the plan as a reference point, not a standard the client must meet.

**Replace and Skip buttons** are visible on every not-yet-completed exercise. On collapsed (not started) exercises, they're small icon-only buttons [🔄] [⏭]. On the expanded (current) exercise, they're full buttons with labels. Once an exercise is "Done", the buttons disappear.

#### Set logging (the core interaction)

The client taps an empty set row to log it:

```
┌────┬──────────┬──────────┬───────────────────────┐
│ 1  │ 10       │ [    ]   │ [50  ] kg    ○        │
└────┴──────────┴──────────┴───────────────────────┘

     ↓ tap the row

┌──────────────────────────────────────────────────┐
│ Set 1 · Overhead Press                           │
│                                                  │
│ Target: 10 reps @ 50 kg                          │
│                                                  │
│ Reps done    Load          Unit                  │
│ [10      ]   [50       ]   [kg 🔽]              │
│                                                  │
│ [✓ Log set]                         [Skip]       │
└──────────────────────────────────────────────────┘
```

**Pre-fill:** `actual_reps` and `load_value`/`load_unit` pre-fill from the planned set. The client just taps "Log set" if they did exactly as planned. If they changed something (different reps or load), they edit before tapping.

**"Log set" action:** `POST /v1/coach/performed_sets { workout_session_id, exercise_id, workout_element_id, position: next_global_position, actual_reps: "10", load_value: 50, load_unit: "kg", completed: true }`.

**"Skip" action:** Same POST but `completed: false`. The set is recorded as skipped so the coach knows.

**One-tap logging shortcut:** For identical sets (client did exactly as planned), a single tap on the ○ checkbox can log the set with all values pre-filled. No modal/expansion needed. The row updates:

```
│ 1  │ 10       │ 10       │ 50 kg          ✓     │ ← one tap, done
```

This is critical for gym UX — the client has sweaty hands, is between sets with a rest timer ticking. Every extra tap costs.

#### Exercise states

```
Not started    — collapsed, shows one-line summary with planned sets
In progress    — expanded, shows set table with logging UI
Done           — collapsed, shows completed summary with actuals
Replaced       — collapsed, shows "Replaced with {exercise}" + link to replacement
Skipped        — collapsed, shows "Skipped" in muted text
```

Only one exercise is expanded at a time. Completing the last set of an exercise auto-collapses it and auto-expands the next.

#### Exercise action buttons

When an exercise is expanded (in progress or not started), the header shows three actions:

```
Overhead Press                    [🔄 Replace] [⏭ Skip]
┌────┬──────────┬──────────┬───────────────────────┐
│ #  │ Plan     │ Actual   │ Load                  │
...
```

**"Replace"** and **"Skip"** are exercise-level actions. "Log set" is set-level (on each row).

#### Replacing an exercise (Scenario 3)

The most common gym deviation. Bench is taken, cable machine broken, client prefers a variation.

```
Client taps [🔄 Replace] on "Barbell Bench Press"

     ↓

┌──────────────────────────────────────────────────┐
│ Replace Barbell Bench Press with:                │
│                                                  │
│ [ 🔍 Search exercises...                   🔽 ] │
│                                                  │
│ Suggestions:                                     │
│   🏋️ Dumbbell Bench Press                        │
│   🏋️ Machine Chest Press                         │
│   🏋️ Push-ups                                    │
│                                                  │
│ [Cancel]                                         │
└──────────────────────────────────────────────────┘

     ↓ select "Dumbbell Bench Press"

The exercise slot transforms:

┌──────────────────────────────────────────────────┐
│ Dumbbell Bench Press                             │
│ (replaces Barbell Bench Press)    ← subtle note  │
│                                                  │
│ ┌────┬──────────┬──────────┬─────────────────┐   │
│ │ #  │ Plan     │ Actual   │ Load            │   │
│ ├────┼──────────┼──────────┼─────────────────┤   │
│ │ 1  │ 8-10     │ [    ]   │ [32  ] kg  ○    │   │
│ │ 2  │ 8-10     │ [    ]   │ [32  ] kg  ○    │   │
│ │ 3  │ 8-10     │ [    ]   │ [32  ] kg  ○    │   │
│ │ 4  │ 8-10     │ [    ]   │ [32  ] kg  ○    │   │
│ └────┴──────────┴──────────┴─────────────────┘   │
└──────────────────────────────────────────────────┘
```

**What happens on replace:**
- The planned set scheme (reps, rest) carries over from the original exercise
- Load value clears (different exercise = different weight) — client fills in their load
- The slot keeps the original `workout_element_id` — this is how we track "this was supposed to be Barbell Bench"
- Performed sets are created with `exercise_id` = the replacement exercise and `workout_element_id` = the original planned slot
- **No new field needed on PerformedSet.** A replacement is detected by comparing `performed_set.exercise_id` vs `workout_element.exercise_id` — if they differ, it's a replacement. This is derivable, not stored.

**Suggestions:** When the replace picker opens, show exercises with the same muscle group or mechanics as the exercise being replaced. The exercise picker already has muscle group filtering — use it here with the replaced exercise's muscle IDs pre-selected.

**"Cancel"** closes the replace picker, returns to the original exercise.

**Replace is a client-side state only.** No API call happens until the client actually logs sets. The "replace" is just changing which exercise_id goes into the performed_sets for this slot.

#### Skipping an exercise

```
Client taps [⏭ Skip] on "Lateral Raises"

     ↓ exercise collapses to:

  Lateral Raises                         Skipped
```

**What happens on skip:**
- No API call. No performed sets are created for this exercise.
- The exercise just collapses with a "Skipped" label.
- The coach sees it as "no performed sets for this workout_element_id" — absence of data IS the signal. No explicit skip record needed.
- The client can un-skip by tapping the exercise again — it re-expands to "Not started."

**Why no API call for skip?** Because skipping is the absence of logging, not an event. If the client skips Lateral Raises, there are simply no performed_sets with that workout_element_id. The coach's comparison view shows "0/3 sets performed" for that exercise — that's the skip. Creating an explicit "skip" record would add complexity for zero information gain.

#### Adding unplanned exercises

```
[+ Add exercise]

     ↓ tap

[ 🔍 Search exercises...                          🔽 ]

     ↓ select "Face Pulls"

┌──────────────────────────────────────────────────┐
│ Face Pulls (added)                               │
│                                                  │
│ No planned sets — log as you go:                 │
│                                                  │
│ [+ Log a set]                                    │
│                                                  │
│ Set 1: [    ] reps  [    ] [kg🔽]   [✓ Log]     │
└──────────────────────────────────────────────────┘
```

For unplanned exercises, there are no pre-filled values. The client enters reps/load and taps "Log." They can add as many sets as they want.

**API:** Same `POST /v1/coach/performed_sets` but `workout_element_id` is null (no planned slot).

#### Finishing a workout

```
[Finish workout]

     ↓ tap

┌──────────────────────────────────────────────────┐
│ Finish Push Day?                                 │
│                                                  │
│ Duration: 58 min                                 │
│ Exercises: 4/5 completed · 1 replaced · 1 skipped│
│ Total sets: 16 logged · 1 added                  │
│                                                  │
│ How are you feeling? (optional)                  │
│ [1] [2] [3] [4] [5]    ← soreness/effort rating │
│                                                  │
│ Notes (optional)                                 │
│ [Great session, PR on bench!              ]      │
│                                                  │
│ [✓ Complete workout]   [Continue training]        │
└──────────────────────────────────────────────────┘
```

**Summary counts:**
- "completed" = exercises where all planned sets were logged (same or different exercise via replace)
- "replaced" = exercises where `performed_set.exercise_id != workout_element.exercise_id`
- "skipped" = exercises with zero performed sets for their `workout_element_id`
- "added" = performed sets with `workout_element_id: null` (not in the plan)

**"Complete workout" action:** `POST /v1/coach/workout_sessions/:id/complete { soreness_rating: 4, notes: "..." }`. Server sets `ended_at` and `state: "completed"`.

**"Continue training":** Closes the modal, returns to the active workout. The client isn't done yet.

**Discard:** If the client wants to abandon the session entirely, a "Discard workout" option in a dropdown or long-press. `POST /v1/coach/workout_sessions/:id/discard`.

#### Rest timer

Between sets, an optional rest timer based on the planned `rest_seconds`:

```
After logging a set:

┌──────────────────────────────────────────────────┐
│              REST                                │
│                                                  │
│             1:42                                 │
│           ───────                                │
│           of 2:00                                │
│                                                  │
│  [Skip rest]                                     │
└──────────────────────────────────────────────────┘
```

Auto-starts after logging a set. Counts down from `rest_seconds`. When timer hits 0, the next set row highlights/expands. The timer is purely client-side — no API call.

"Skip rest" closes the timer and moves to the next set immediately.

---

## PART 4: Coach View of Training Logs

The coach sees their client's workout history on the client detail page.

### Client detail: workout history section

```
WORKOUT HISTORY

┌──────────────────────────────────────────────────┐
│ Push Day · Monday                       Mar 25   │
│ 58 min · 4/5 exercises · 1 replaced              │
│ Effort: 4/5                            [View →]  │
├──────────────────────────────────────────────────┤
│ Pull Day · Wednesday                    Mar 23   │
│ 52 min · 5/5 exercises                           │
│ Effort: 2/5                            [View →]  │
├──────────────────────────────────────────────────┤
│ Legs · Friday                           Mar 21   │
│ 65 min · 5/5 exercises                           │
│ Effort: 5/5                            [View →]  │
├──────────────────────────────────────────────────┤
│ Freestyle workout                       Mar 20   │
│ 35 min · 3 exercises                    [View →]  │
└──────────────────────────────────────────────────┘

[Load more]
```

The card subtitle shows the adaptation summary: "4/5 exercises · 1 replaced" tells the coach at a glance that the client adapted. Freestyle workouts (no `planned_workout_id`) show just exercise count, no adherence ratio.

### Session detail view (coach sees what the client actually did)

The comparison is informational, not judgmental. The coach uses this to understand the client's session and adjust future programming.

```
Workout Session · Push Day · Mar 25, 2026
Duration: 58 min · Soreness: 4/5
Notes: "Great session, PR on bench!"

Adherence: 4/5 exercises · 19/20 sets

┌──────────────────────────────────────────────────┐
│ Barbell Bench Press                              │
│ ┌────┬──────────┬──────────┬──────────┐          │
│ │ #  │ Plan     │ Done     │ Load     │          │
│ ├────┼──────────┼──────────┼──────────┤          │
│ │ 1  │ 8-10     │ 10       │ 80 kg    │          │
│ │ 2  │ 8-10     │ 9        │ 80 kg    │          │
│ │ 3  │ 8-10     │ 8        │ 80 kg    │          │
│ │ 4  │ 8-10     │ 6        │ 75 kg    │          │
│ └────┴──────────┴──────────┴──────────┘          │
│                                                  │
│ Dumbbell Bench Press                             │
│ 🔄 Replaced Incline DB Press                    │ ← neutral badge
│ ┌────┬──────────┬──────────┬──────────┐          │
│ │ 1  │ 12       │ 12       │ 32 kg    │          │
│ │ 2  │ 12       │ 10       │ 32 kg    │          │
│ │ 3  │ 12       │ 10       │ 30 kg    │          │
│ └────┴──────────┴──────────┴──────────┘          │
│                                                  │
│ Lateral Raises                                   │
│ — Skipped                                        │ ← muted, not red
│                                                  │
│ Face Pulls                                       │
│ + Added by client                                │ ← positive framing
│   3 × 15 @ 15 kg                                │
└──────────────────────────────────────────────────┘
```

**Comparison framing — deliberate choices:**
- Column headers say "Plan" and "Done" (not "Target" and "Actual" — those imply pass/fail)
- No red ⚠️ icons on individual sets. The numbers speak for themselves. If the client did 6 reps on a set planned for 8-10, the coach sees "6" and draws their own conclusion.
- Replaced exercises show a neutral 🔄 badge with the original exercise name — informational, not punitive
- Skipped exercises show "— Skipped" in muted text, not red/danger
- Client-added exercises show "+ Added" — positive framing, the client did extra work
- **Adherence summary** at the top: "4/5 exercises · 19/20 sets" gives the coach a quick read without scrolling

**How replacements are detected (no new fields):**
- Load all performed_sets for this session
- Group by `workout_element_id` (links to the planned exercise slot)
- If `performed_set.exercise_id != workout_element.exercise_id` → replacement
- If `workout_element_id` is null → client-added exercise
- If a workout_element has no performed_sets → skipped

### API endpoints for workout sessions

Already exist in the backend:

```
POST   /v1/coach/workout_sessions                    → create session
GET    /v1/coach/workout_sessions/:id                 → get with performed_sets
GET    /v1/coach/workout_sessions?client_id=...       → list for client
POST   /v1/coach/workout_sessions/:id/complete        → complete
POST   /v1/coach/workout_sessions/:id/discard         → discard
DELETE /v1/coach/workout_sessions/:id                 → delete

POST   /v1/coach/performed_sets                       → log a set (needs workout_session_id)
PATCH  /v1/coach/performed_sets/:id                   → update a logged set
DELETE /v1/coach/performed_sets/:id                   → remove a logged set
```

**Note:** These endpoints are under `/v1/coach/` — they use coach auth. For the client app, either:
- (a) Create equivalent `/v1/client/` endpoints with client auth
- (b) Proxy through coach auth if the client app authenticates as a sub-entity of the coach's business

This is an architecture decision that depends on how the client app authenticates. The data model supports both — `WorkoutSession.client_id` scopes everything.

---

## PART 5: Schema Changes Needed

### Backend (before building the client app)

| Change | Priority | Migration |
|--------|----------|-----------|
| Add `workout_element_id` (nullable FK) to `performed_sets` | 🔴 High | Add column + FK constraint. Existing rows get null. |
| Add index on `(workout_session_id, exercise_id)` to `performed_sets` | 🟡 Medium | For efficient grouping by exercise in session. |
| Consider adding `rest_seconds` to `performed_set` | 🟢 Low | If we want to track actual rest taken (not just planned). Defer for now. |

### Frontend (new API types)

| Change | File | Detail |
|--------|------|--------|
| Add `WorkoutSession` and `PerformedSet` types | `trainingPlans.ts` or new `workoutSessions.ts` | Types + all CRUD endpoints |
| Add infinite query for training plans | `trainingPlans.ts` | Same pattern as exercises, foods. Needed for list screen. |
| Add `TrainingPlanPicker` component | `training-plans/components/` | For client detail "Assign training plan" (CX-3) |

---

## Implementation Phases

### Phase 1: Coach-side builder (Weeks 1-3)

| Step | What | Effort |
|------|------|--------|
| 1.1 | Add infinite query to `trainingPlans.ts` | Small |
| 1.2 | List screen + card component | Small |
| 1.3 | Create + edit screens + form component | Small |
| 1.4 | Detail page shell (header, metadata, actions, delete, duplicate) | Medium |
| 1.5 | WorkoutSection component (weekday sections, add workout, rename, delete) | Medium |
| 1.6 | SetSchemeInput component | Medium |
| 1.7 | Add exercise flow (picker → set scheme → create element) | Medium |
| 1.8 | ExerciseElement (collapsed overview + expand to edit) | Medium |
| 1.9 | Per-set detail editor (mixed set types) | Medium |
| 1.10 | Copy workout + copy exercise | Small |
| 1.11 | Copy to client + TrainingPlanPicker | Small |

### Phase 2: Backend preparation for logging (Week 3)

| Step | What | Effort |
|------|------|--------|
| 2.1 | Add `workout_element_id` to performed_sets migration | Small |
| 2.2 | Update PerformedSet schema + changeset | Small |
| 2.3 | Client auth endpoints (or verify coach endpoints work for client app) | Medium |

### Phase 3: Client-side logging (Weeks 4-6)

| Step | What | Effort |
|------|------|--------|
| 3.1 | Client app: workout home (today's workout, start/freestyle) | Medium |
| 3.2 | Active workout screen (exercise list with states) | Large |
| 3.3 | Set logging UI (pre-fill from plan, one-tap + expanded) | Large |
| 3.4 | Add unplanned exercise | Small |
| 3.5 | Finish workout (summary, rating, notes) | Small |
| 3.6 | Rest timer | Small |
| 3.7 | Workout history list | Small |

### Phase 4: Coach view of logs (Week 6-7)

| Step | What | Effort |
|------|------|--------|
| 4.1 | Client detail: workout history section | Medium |
| 4.2 | Session detail view (planned vs actual comparison) | Medium |