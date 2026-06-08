# Reference: Example Handover Document

This is a real-shaped example of what a finished handover looks like for a
moderately complex change. Use it as the gold standard when producing your
own. The example is fictional but follows the structure exactly.

The skill's audience benefits from seeing one filled in — it's much easier to
produce a good handover after seeing one than after reading rules about one.

---

# Frontend Handover: Training Plan Architecture Redesign

**Date:** 2026-04-21
**Spec:** `docs/specs/ux-spec-training-plan-redesign.md`
**PR:** `feature/training-plan-items-redesign` (PR #487)
**Breaking change:** Yes — multiple
**Migration urgency:** Same release — frontend cannot ship the next training plan UI without these changes

---

## TL;DR

- `PlannedWorkout` is renamed to `Workout`. JSON keys, route paths, and FK names all changed (`planned_workout_id` → `workout_id`).
- New entity `PlanItem` mirrors nutrition's PlanItem. The schedule (which workout on which day) is now separate from the workout content.
- `day_number` integer (1-7) is gone. Days are now strings (`"monday"`-`"sunday"`) everywhere — including in `rest_days` on training plans.
- Same workout can now be assigned to multiple days (one Workout, multiple PlanItems). The frontend builder needs a "Workout library" view + a "Weekly schedule" view.
- All training endpoints have new shapes. No backwards compatibility — old payloads will fail validation.

---

## Changes

### Change 1: Rename `PlannedWorkout` to `Workout`

**Type:** Renamed entity, breaking
**Spec reference:** From `ux-spec-training-plan-redesign.md`:
> "Rename `PlannedWorkout` to `Workout`. Table `planned_workouts` → `workouts`."

**Breaking:** Yes

**What changed in the backend**
The schema module is now `Easy.Training.Workout`. The database table is `workouts`. The FK on `workout_elements` is `workout_id` (was `planned_workout_id`). The FK on `workout_sessions` is `workout_id` (was `planned_workout_id`).

**What the frontend will observe**
Every JSON response that previously included `planned_workouts` or `planned_workout_id` now uses `workouts` and `workout_id`. Every route that previously used `/planned_workouts/` now uses `/workouts/`.

**API details**

Routes that changed:
- `GET /v1/coach/training_plans/:id/planned_workouts` → `GET /v1/coach/training_plans/:id/workouts`
- `POST /v1/coach/training_plans/:id/planned_workouts` → `POST /v1/coach/training_plans/:id/workouts`
- `PATCH /v1/coach/planned_workouts/:id` → `PATCH /v1/coach/workouts/:id`
- `DELETE /v1/coach/planned_workouts/:id` → `DELETE /v1/coach/workouts/:id`

Request body for creating a workout:

**Before**
```json
POST /v1/coach/training_plans/:id/planned_workouts
{
  "name": "Push Day",
  "day_number": 1,
  "notes": "Focus on chest"
}
```

**After**
```json
POST /v1/coach/training_plans/:id/workouts
{
  "name": "Push Day",
  "notes": "Focus on chest"
}
```

Note `day_number` is gone — assigning a workout to a day is now a separate operation (see Change 3).

**Frontend impact**
- Rename TypeScript type `PlannedWorkout` to `Workout` (likely in `types/training.ts`)
- Update RTK Query endpoint slice — every endpoint that mentioned `planned_workout` is renamed
- Search and replace `planned_workout_id` → `workout_id` across the codebase
- Update fixtures, mocks, and Storybook stories
- Update any UI text that says "planned workout" to "workout" (likely few places — coaches always called these "workouts" anyway)

**Example**
```bash
# Before
curl -X POST $API/v1/coach/training_plans/abc/planned_workouts \
  -d '{"name":"Push Day","day_number":1}'

# After
curl -X POST $API/v1/coach/training_plans/abc/workouts \
  -d '{"name":"Push Day"}'
```

---

### Change 2: New entity `PlanItem` (training)

**Type:** New endpoint(s), new schema
**Spec reference:** From `ux-spec-training-plan-redesign.md`:
> "New entity `Training.PlanItem` mirrors `Nutrition.PlanItem`. The join entity that says 'this Workout goes on this day in this slot.'"

**Breaking:** Yes — old plan responses had embedded day info; new responses don't.

**What changed in the backend**
A new table `training_plan_items` and schema `Easy.Training.PlanItem`. Each row links one Workout to one (day + workout_type + plan) tuple. Multiple PlanItems can reference the same Workout — that's how a workout gets assigned to multiple days.

**What the frontend will observe**
The training plan response now includes a `plan_items` array alongside `workouts`. The day assignment lives in `plan_items`, not on the workout itself. To display a weekly schedule, group PlanItems by `day` and resolve `workout_id` against the `workouts` array.

**API details**

New endpoints:
- `POST /v1/coach/training_plans/:id/plan_items` — assign a workout to a day
- `PATCH /v1/coach/plan_items/:id` — change which workout is on a given day
- `DELETE /v1/coach/plan_items/:id` — unassign

Request body to assign a workout:

```json
POST /v1/coach/training_plans/:id/plan_items
{
  "day": "monday",
  "workout_type": "primary",
  "workout_id": "<workout-uuid>"
}
```

Response (201):
```json
{
  "data": {
    "id": "<plan-item-uuid>",
    "day": "monday",
    "workout_type": "primary",
    "workout_id": "<workout-uuid>",
    "training_plan_id": "<plan-uuid>",
    "inserted_at": "2026-04-21T...",
    "updated_at": "2026-04-21T..."
  }
}
```

Status codes:
- `201 Created` — assignment created
- `404 Not Found` — plan or workout doesn't exist or belongs to a different business
- `422 Unprocessable Entity`:
  - `day` not one of `monday`-`sunday`
  - `workout_type` not one of `primary`, `alternative`
  - `workout_id` not in the same plan
  - day conflicts with `rest_days` on the plan

**Frontend impact**
- New TypeScript type `PlanItem` (id, day, workout_type, workout_id, training_plan_id, timestamps)
- New RTK Query endpoints: `createPlanItem`, `updatePlanItem`, `deletePlanItem`
- Builder UI now has TWO views: "Weekly schedule" (PlanItems grouped by day) and "Workout library" (Workouts list)
- The "drag workout to day" action calls `createPlanItem`
- The "remove from day" action calls `deletePlanItem` (does NOT delete the Workout)

**Example**
```bash
# Assign Push Day workout to Monday
curl -X POST $API/v1/coach/training_plans/abc/plan_items \
  -d '{"day":"monday","workout_type":"primary","workout_id":"def"}'

# Same workout to Thursday — same workout_id, different day
curl -X POST $API/v1/coach/training_plans/abc/plan_items \
  -d '{"day":"thursday","workout_type":"primary","workout_id":"def"}'
```

---

### Change 3: `day_number` integer → `day` string

**Type:** Schema change, breaking
**Spec reference:** From `ux-spec-training-plan-redesign.md`:
> "`day` is a string (`"monday"` not integer 1). Aligned with nutrition PlanItem... String days are more readable in API responses and DB queries, and they match exactly between training and nutrition."

**Breaking:** Yes

**What changed in the backend**
Throughout the training domain, the day-of-week representation is now the lowercase string `"monday"` through `"sunday"`. This affects PlanItems and `training_plans.rest_days`.

**What the frontend will observe**
- PlanItems carry `day: "monday"` instead of `day_number: 1`
- `training_plans.rest_days` is now `["sunday"]` instead of `[7]`
- Validation rejects integers in any day field — `400/422` returned
- All weekday display logic should use the string directly (no integer mapping needed)

**API details**

`training_plans.rest_days` field:

**Before**
```json
{
  "rest_days": [7]
}
```

**After**
```json
{
  "rest_days": ["sunday"]
}
```

Migration note: existing data was migrated by the backend (`[7]` → `["sunday"]` etc.) — no frontend backfill needed.

**Frontend impact**
- Replace any `dayNumber: number` field with `day: string` in TypeScript types
- Remove integer-to-weekday mapping helpers — use the string directly
- Replace integer-keyed selects/dropdowns with string-keyed ones
- Update any sort logic that relied on integer ordering — sort by a fixed weekday array (`["monday", "tuesday", ...]`) or by the value of `Date.getDay()` mapped to weekday names

**Example**
```typescript
// Before
const WEEKDAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const label = WEEKDAYS[planItem.day_number];

// After
const label = planItem.day.charAt(0).toUpperCase() + planItem.day.slice(1);
// or use a small {monday: "Monday", ...} map for i18n
```

---

### Change 4: Workout sessions FK rename

**Type:** Schema change, breaking
**Spec reference:** Implicit — followup of Change 1 (rename of PlannedWorkout).

**Breaking:** Yes

**What changed in the backend**
`workout_sessions.planned_workout_id` is now `workout_sessions.workout_id`. The session still snapshots the workout at creation time — that behavior is unchanged.

**What the frontend will observe**
When starting a workout session, the request body field is `workout_id` not `planned_workout_id`. The response field is also renamed.

**API details**

Starting a session:

**Before**
```json
POST /v1/coach/workout_sessions
{
  "client_id": "...",
  "planned_workout_id": "..."
}
```

**After**
```json
POST /v1/coach/workout_sessions
{
  "client_id": "...",
  "workout_id": "..."
}
```

Freestyle workouts (no plan) work the same — omit `workout_id` instead of `planned_workout_id`.

**Frontend impact**
- Update `startWorkoutSession` mutation request body
- Update `WorkoutSession` TypeScript type
- The "Today screen" logic that resolves today's workout from PlanItems now passes `workout_id` (the resolved Workout's id, not the PlanItem id)

---

## Migration checklist for frontend

- [ ] Rename TypeScript type `PlannedWorkout` to `Workout` across the codebase
- [ ] Add new TypeScript type `PlanItem`
- [ ] Update RTK Query endpoint paths: `/planned_workouts/` → `/workouts/`
- [ ] Add new RTK Query endpoints for PlanItem CRUD
- [ ] Replace `day_number: number` with `day: string` everywhere
- [ ] Update `rest_days` handling: `number[]` → `string[]`
- [ ] Update `startWorkoutSession`: `planned_workout_id` → `workout_id`
- [ ] Update training plan builder: split into "Workout library" + "Weekly schedule" views
- [ ] Add "drag workout to day" → calls `createPlanItem`
- [ ] Add "Used on: Mon, Thu" badges to workout cards (computed from `plan_items` array)
- [ ] Add edit-confirmation when editing a workout used on multiple days
- [ ] Add "Make a copy for this day only" action (new endpoint, see Change 5 if added — none yet)
- [ ] Update Today screen to resolve today's workout via PlanItem lookup (group plan_items by day)
- [ ] Update fixtures, mocks, Storybook stories
- [ ] Update integer-based weekday sort logic to string-based

---

## Things that did NOT change

- `WorkoutElement` schema is unchanged — still has `position`, `superset_group_id`, `notes`, `exercise_id`, embedded `planned_sets`. Only the parent table name changed.
- `PerformedSet` schema is unchanged. Logging endpoints (`POST /v1/coach/performed_sets`) are unchanged.
- `WorkoutSession` lifecycle (`start`, `complete`, `discard`) is unchanged. Only the FK name changed.
- The snapshot stored in `workout_sessions.planned_snapshot` keeps its key name (still called `planned_snapshot` because it represents the planned workout at the moment of session creation — see Open Questions).
- Authentication, business_id scoping, and JWT handling are unchanged.
- Nutrition plans, meals, plan_items, food/recipe — completely unchanged.
- Client onboarding, status transitions, invitation flow — unchanged.

---

## Open questions / known gaps

- **Snapshot field naming.** We kept `workout_sessions.planned_snapshot` as the field name even though `planned_workout` was renamed. Rationale: the snapshot is a record of "what was planned at session start," not a reference to the Workout entity. If the frontend feels this is inconsistent, we can rename it next sprint.
- **"Make a copy for this day only" action.** Spec mentions an "unshare" escape hatch (deep-copy a Workout so one day can diverge). Not yet implemented — endpoint will come in PR #488. Frontend can build the rest of the UI without it; the button can be wired up later.
- **Alternative workouts.** Backend supports `workout_type: "alternative"` but no client UI yet. Frontend should treat anything other than `"primary"` as "ignore for now." Filter PlanItems by `workout_type === "primary"` when displaying to the client.
- **Old data.** Existing PlannedWorkouts that were duplicated across days (e.g., Monday Push Day + Thursday Push Day were two separate rows) were NOT auto-merged into one shared Workout. Coaches will see them as separate Workouts after migration. They can manually consolidate using the new "assign one workout to multiple days" feature. The frontend doesn't need to do anything here — just be aware that old plans might have multiple identically-named Workouts.