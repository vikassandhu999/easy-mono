# Spec Update: Training Plan Architecture Redesign

**Date:** 2026-04-21
**Scope:** Breaking change to training plan backend + frontend. NOT backwards compatible.
**Motivation:** Align training plan architecture to the nutrition plan's content-vs-schedule separation.
**Affects:** TrainingPlan, PlannedWorkout (renamed → Workout), WorkoutElement, PlannedSet, WorkoutSession, PerformedSet, all training endpoints, all training frontend.

---

## The Core Idea

Nutrition already has the right architecture:

```
Plan → Meal (reusable content)
Plan → PlanItem (schedule: which Meal on which day)
```

A coach creates "Breakfast Oats" once. Then assigns it to Monday, Wednesday, Friday through three PlanItems. Editing the Meal edits all three days.

Training currently has a flat architecture:

```
TrainingPlan → PlannedWorkout (content + schedule merged into one entity)
```

A coach creates "Push Day" on Monday. To repeat it on Thursday, they duplicate the entire workout — creating a second PlannedWorkout with all its elements and sets copied. Editing Monday's workout doesn't touch Thursday's. This breaks the "build once, assign many" pattern.

**The fix:** Split PlannedWorkout into the same two concepts nutrition uses:

```
TrainingPlan → Workout (reusable content: exercises + sets)
TrainingPlan → PlanItem (schedule: which Workout on which day + slot)
```

---

## What Changes

### Entity Renaming

| Old | New | Table rename? |
|-----|-----|---------------|
| PlannedWorkout | Workout | Yes: `planned_workouts` → `workouts` |
| — (new) | Training.PlanItem | New table: `training_plan_items` |

### PlannedWorkout → Workout

**Fields removed:**
- `day_number` — schedule moves to PlanItem
- `training_plan_id` — ownership moves to PlanItem (Workout is standalone within a plan)

Wait — not exactly standalone. A Workout still belongs to a Plan (same as Meal belongs to Plan in nutrition). The difference is that the day assignment moves out.

**Corrected: Workout keeps `training_plan_id`.** This mirrors Meal, which has `plan_id`. A Workout is content owned by a Plan. The schedule (which day) is in PlanItem.

```
# Workout (renamed from PlannedWorkout)
schema "workouts" do
  field :name, :string
  field :notes, :string
  # day_number REMOVED — lives in PlanItem now

  belongs_to :business, Orgs.Business
  belongs_to :training_plan, TrainingPlan

  has_many :workout_elements, WorkoutElement
  has_many :plan_items, Training.PlanItem

  timestamps
end
```

**What stays the same:**
- `name`, `notes`
- `business_id`
- `has_many :workout_elements` (unchanged)
- All changeset logic except day_number validation

### New Entity: Training.PlanItem

Mirrors `Nutrition.PlanItem` exactly. The join entity that says "this Workout goes on this day in this slot."

```
# Training.PlanItem
schema "training_plan_items" do
  field :day, :string                    # "monday", "tuesday", ... (same as nutrition)
  field :workout_type, :string           # "primary", "alternative"

  belongs_to :training_plan, TrainingPlan
  belongs_to :workout, Workout
  belongs_to :business, Orgs.Business
  belongs_to :creator, Orgs.Coach

  timestamps
end
```

**Key design decisions:**

**`day` is a string ("monday" not integer 1).** Aligned with nutrition PlanItem, which uses `"monday"`, `"tuesday"` etc. The old `day_number` integer (1-7) is gone. String days are more readable in API responses and DB queries, and they match exactly between training and nutrition.

**`workout_type` replaces nutrition's `meal_type`.** In nutrition, `meal_type` is the slot within a day (breakfast, lunch, dinner). In training, `workout_type` serves a similar purpose:

| workout_type | Meaning |
|-------------|---------|
| `"primary"` | The main workout for this day. Client sees this by default. |
| `"alternative"` | An alternative the client can choose instead. E.g., "Push Day (Home)" as alternative to "Push Day (Gym)". |

For MVP, only `"primary"` is needed. `"alternative"` is the extension point for later. A coach can put two PlanItems on the same day — one primary, one alternative — and the client picks which one to do.

**Multiple PlanItems can point to the same Workout.** This is the whole point. Push Day on Monday and Thursday = two PlanItems, one Workout. Edit the Workout, both days update.

### TrainingPlan Changes

```
# TrainingPlan (updated)
schema "training_plans" do
  field :name, :string
  field :description, :string
  field :status, Ecto.Enum, values: [:active, :archived]
  field :start_date, :date
  field :end_date, :date
  field :rest_days, {:array, :string}, default: []    # CHANGED from integer to string

  belongs_to :business, Orgs.Business
  belongs_to :author, Orgs.Coach
  belongs_to :client, Clients.Client
  belongs_to :original_template, __MODULE__

  has_many :workouts, Workout                          # RENAMED from planned_workouts
  has_many :plan_items, Training.PlanItem               # NEW

  timestamps
end
```

**`rest_days` changes from `{:array, :integer}` to `{:array, :string}`.**

Old: `[7]` (Sunday).
New: `["sunday"]`.

Aligned with nutrition's string-based day representation. Same validation: must be valid day names, no duplicates, can't overlap with days that have PlanItems.

### WorkoutElement — No Changes

WorkoutElement stays exactly as it is. It belongs to a Workout (formerly PlannedWorkout) and has embedded PlannedSets. The FK rename from `planned_workout_id` to `workout_id` is the only column change.

### WorkoutSession — FK Rename Only

```
# WorkoutSession (updated FK name)
schema "workout_sessions" do
  # ...same fields...
  belongs_to :workout, Workout    # RENAMED from planned_workout
  # ...rest unchanged...
end
```

Column rename: `planned_workout_id` → `workout_id`. The snapshot logic is unchanged — it still snapshots the Workout's elements and sets at session creation time.

### PerformedSet — No Changes

PerformedSet already has `workout_element_id` which points to WorkoutElement. WorkoutElement's parent changed name (PlannedWorkout → Workout) but PerformedSet doesn't care — it points to WorkoutElement directly.

---

## What This Unlocks (UX Wins)

### Win 1: Assign one workout to multiple days

Coach creates "Push Day" with 5 exercises. Assigns it to Monday and Thursday via two PlanItems. Done. No duplication. If they add an exercise to Push Day, both days see it.

The weekly overview now shows:

```
Mon  Push Day       ← PlanItem { day: monday, workout_id: W1 }
Tue  Pull Day       ← PlanItem { day: tuesday, workout_id: W2 }
Wed  Legs           ← PlanItem { day: wednesday, workout_id: W3 }
Thu  Push Day       ← same W1!
Fri  Pull Day       ← same W2!
Sat  Legs           ← same W3!
Sun  Rest
```

6 PlanItems, 3 Workouts. Currently this requires 6 PlannedWorkouts with all exercises duplicated.

### Win 2: Alternative workouts

Coach assigns two workouts to the same day:

```
Mon  Push Day (Gym)       ← PlanItem { day: monday, type: primary, workout_id: W1 }
     Push Day (Home)      ← PlanItem { day: monday, type: alternative, workout_id: W4 }
```

The client sees "Push Day (Gym)" by default, with a "See alternatives" option that reveals "Push Day (Home)." For clients who travel or can't always make it to the gym.

### Win 3: Copy day is trivial

Nutrition already has `copy_day` that copies PlanItems from one day to another. Training gets the same operation — copy PlanItems, not deep-copy Workouts.

```
Copy Monday to Thursday:
  → PlanItem { day: thursday, workout_id: W1 }  (same workout reference)
```

No element duplication, no set copying, no transaction with N inserts. One row.

### Win 4: "Workout library" within a plan

The coach's plan has a Workouts list (like the Meals list in nutrition). They build their workout library first, then drag/assign to days. This matches how coaches think: "I have 3 workouts, I assign them across the week."

### Win 5: Consistent API patterns

Nutrition and training now have identical structures. One mental model for the developer. One UI pattern for the coach. If you know how to build a meal plan, you know how to build a training plan.

---

## Coach UX — Builder Flow Change

### Current flow (flat)

```
Open plan → see workout list sorted by day → add workout (gets next day_number) → add exercises
```

### New flow (two-level, matches nutrition)

```
Open plan → see weekly overview (PlanItems) + workout library (Workouts)

Step 1: Build workouts in the library
  [+ New workout] → name it "Push Day" → add exercises

Step 2: Assign to days
  Monday row → [+ Assign workout] → pick "Push Day" from library → done
  Thursday row → [+ Assign workout] → pick "Push Day" again → done
```

### Builder page layout (revised)

```
Training Plan: PPL 6-Day Split

← Back  ✏️ Edit  📋 Copy to Client  📋 Duplicate  🗑 Delete

PPL 6-Day Split
A 6-day push/pull/legs program.
┌Active┐

═══════════════════════════════════════════════════

WEEKLY SCHEDULE

 Mon  Push Day         5 exercises    [✕]
 Tue  Pull Day         5 exercises    [✕]
 Wed  Legs             5 exercises    [✕]
 Thu  Push Day         5 exercises    [✕]  ← same workout as Mon
 Fri  Pull Day         5 exercises    [✕]  ← same workout as Tue
 Sat  Legs             5 exercises    [✕]  ← same workout as Wed
 Sun  Rest

[+ Assign workout to a day]

═══════════════════════════════════════════════════

WORKOUTS (3)

┌──────────────────────────────────────────────────┐
│ Push Day                                   ✏️  🗑│
│                                                  │
│  Barbell Bench Press    4 × 8-10 @ 80kg         │
│  Overhead Press         3 × 10 @ 50kg           │
│  Incline DB Press       3 × 12 @ 30kg           │
│  Lateral Raises         3 × 15 @ 10kg           │
│  Tricep Pushdowns       3 × 12 @ 25kg           │
│                                                  │
│  Used on: Mon, Thu                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Pull Day                                   ✏️  🗑│
│  (exercises...)                                  │
│  Used on: Tue, Fri                               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Legs                                       ✏️  🗑│
│  (exercises...)                                  │
│  Used on: Wed, Sat                               │
└──────────────────────────────────────────────────┘

[+ New workout]
```

### "Used on" indicator

Each Workout card shows which days it's assigned to: "Used on: Mon, Thu." Computed from PlanItems that reference this Workout. Helps the coach understand that editing this workout affects multiple days.

### Adding a workout to a day

Coach taps "Assign workout to a day" or the empty row for a specific day:

```
Assign workout to Monday:

Pick a workout from this plan:
  🏋️ Push Day      (already on Mon, Thu)
  🏋️ Pull Day      (already on Tue, Fri)
  🏋️ Legs          (already on Wed, Sat)

[Create new workout]
```

Selecting an existing workout creates a PlanItem: `{ day: "monday", workout_id: W1, workout_type: "primary" }`. One row insert. No duplication.

"Create new workout" opens the workout builder (name + exercise picker), creates the Workout first, then creates the PlanItem assigning it.

### Editing a shared workout

When the coach taps edit on a Workout that's used on multiple days, show:

```
Editing "Push Day"
This workout is used on Monday and Thursday.
Changes will apply to both days.

[Edit]  [Make a copy for this day only]
```

"Make a copy for this day only" creates a new Workout (deep-copy of elements + sets) and updates that day's PlanItem to point to the copy. This is the "unshare" action — useful when the coach wants Thursday's Push Day to diverge from Monday's.

---

## Client UX — What Changes

### Today screen

No visible change. The client still sees "Push Day — 5 exercises — Start workout." The data comes from a different path (PlanItem → Workout instead of PlannedWorkout directly) but the presentation is identical.

### "Today" resolution

Old: match `Date.today()`'s weekday as integer against `planned_workout.day_number`.
New: match `Date.today()`'s weekday as string against `plan_item.day`, then load `plan_item.workout`.

### Alternatives on the today screen (future)

If a day has a primary and an alternative PlanItem:

```
Today · Monday

Push Day (Gym)                         primary
5 exercises · about 60 minutes
[▶ Start workout]

or

Push Day (Home)                        alternative
4 exercises · about 45 minutes
[▶ Start this instead]
```

For MVP: only `"primary"` type exists. No alternatives UI needed. The structure supports it when ready.

---

## Migration Path

This is a breaking change. Not backwards compatible. Clean migration.

### Database migration

1. Rename table `planned_workouts` → `workouts`
2. Remove `day_number` column from `workouts`
3. Rename column `workout_elements.planned_workout_id` → `workout_elements.workout_id`
4. Rename column `workout_sessions.planned_workout_id` → `workout_sessions.workout_id`
5. Create new table `training_plan_items` (day, workout_type, workout_id, training_plan_id, business_id, creator_id, timestamps)
6. Migrate existing data: for each old PlannedWorkout, create a PlanItem with `day: day_name(old.day_number)`, `workout_type: "primary"`, `workout_id: old.id`, `training_plan_id: old.training_plan_id`
7. Change `training_plans.rest_days` column from `integer[]` to `string[]`. Migrate data: `[7]` → `["sunday"]`, `[1,7]` → `["monday","sunday"]`, etc.

### Data migration detail (step 6)

Every existing PlannedWorkout becomes a Workout (renamed in place) plus one PlanItem. No data loss. The day_number moves from the workout to the PlanItem.

```sql
-- After renaming table and dropping day_number column
INSERT INTO training_plan_items (id, day, workout_type, workout_id, training_plan_id, business_id, creator_id, inserted_at, updated_at)
SELECT
  gen_random_uuid(),
  CASE day_number
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    -- ...etc
  END,
  'primary',
  id,
  training_plan_id,
  business_id,
  (SELECT author_id FROM training_plans WHERE id = planned_workouts.training_plan_id),
  NOW(), NOW()
FROM planned_workouts;  -- run BEFORE table rename, or use old table name
```

**Important:** Run the data migration BEFORE removing `day_number` from the table and BEFORE renaming the table. Sequence:

1. Create `training_plan_items` table
2. Run data migration (read `day_number` from `planned_workouts`, write to `training_plan_items`)
3. Rename `planned_workouts` → `workouts`
4. Drop `day_number` from `workouts`
5. Rename FK columns

### Shared workouts — not created by migration

The migration creates one PlanItem per old PlannedWorkout. If a coach had Push Day duplicated on Monday AND Thursday (two separate PlannedWorkouts with identical exercises), the migration creates two Workouts and two PlanItems — they are NOT merged into one shared Workout. This is correct: merging would require detecting "identical" workouts (matching exercises, sets, names), which is fragile and surprising.

After migration, coaches can use the new "assign same workout to multiple days" feature going forward. Old duplicate workouts remain as separate Workouts.

---

## Parallel Structure Summary

| Concept | Nutrition | Training (new) |
|---------|-----------|---------------|
| Plan container | `Plan` | `TrainingPlan` |
| Reusable content | `Meal` | `Workout` |
| Content items | `MealItem` (food/recipe) | `WorkoutElement` (exercise + sets) |
| Schedule assignment | `PlanItem` (day + meal_type + meal_id) | `PlanItem` (day + workout_type + workout_id) |
| Day representation | `"monday"` string | `"monday"` string (was integer) |
| Slot within a day | `meal_type`: breakfast, lunch, dinner | `workout_type`: primary, alternative |
| Copy day | Copy PlanItems | Copy PlanItems |
| Assign to client | Deep-copy Plan + Meals + MealItems + PlanItems | Deep-copy Plan + Workouts + Elements + PlanItems |
| Duplicate plan | Same | Same |

---

## What's NOT in This Spec

- Specific API route paths (let the coder design these to match existing patterns)
- Frontend component code (existing components adapt to the new data shape)
- The "alternative workout" client UI (deferred — the data model supports it, the UI comes later)
- Superset grouping (still deferred, `superset_group_id` stays on WorkoutElement unchanged)
- Nutrition logging changes (MealLog/FoodLogEntry are unaffected)
- Client experience improvements (separate spec)

---

## Risk: Shared Workout Editing Surprises

The biggest UX risk of this redesign: a coach edits Push Day and doesn't realize they changed Thursday too.

**Mitigations:**

1. "Used on: Mon, Thu" badge on every Workout card (always visible)
2. Edit confirmation when shared: "This workout is used on Monday and Thursday. Changes will apply to both days."
3. "Make a copy for this day only" escape hatch (unshare)
4. The weekly schedule view shows the same workout name on both days — the visual repetition makes the sharing obvious

These are frontend UX patterns, not backend complexity. The backend is simpler than before (fewer rows, fewer duplicates, fewer copy operations).