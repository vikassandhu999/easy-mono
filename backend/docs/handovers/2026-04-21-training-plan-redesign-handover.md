# Frontend Handover: Training Plan Architecture Redesign

**Date:** 2026-04-21
**Spec:** `docs/specs/training-plan-redesign-2026-04-21.md`
**PR:** `easy-backend-refactoring` (local branch)
**Breaking change:** Yes
**Migration urgency:** Immediate

---

## TL;DR

- `PlannedWorkout` is now `Workout`. Route paths, JSON keys, and foreign-key field names all changed from `planned_workout*` to `workout*`.
- Training plans no longer encode schedule inside workouts. The frontend must now use `workouts[]` plus `plan_items[]` together.
- `day_number` is gone. Weekdays are lowercase strings everywhere: `monday` through `sunday`. `rest_days` also changed from `number[]` to `string[]`.
- New coach endpoints exist for `training_plan_items` CRUD and `POST /v1/coach/training_plans/{id}/copy-day`.
- Existing frontend training-plan builder, Today screen resolution, and workout-session start payloads will break until updated.

---

## Changes

### Change 1: Rename `PlannedWorkout` to `Workout`

**Type:** renamed entity, modified endpoint, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "| PlannedWorkout | Workout | Yes: `planned_workouts` -> `workouts` |"

**Breaking:** Yes

**What changed in the backend**
The backend entity formerly exposed as `PlannedWorkout` is now exposed as `Workout`. Coach routes moved from `/planned_workouts` to `/workouts`, schema names changed, and JSON keys now say `workout` / `workouts` instead of `planned_workout` / `planned_workouts`.

**What the frontend will observe**
Any frontend code still calling `/planned_workouts` will get `404`. Any code still expecting `planned_workouts` in training plan responses will deserialize empty or fail type checks. Anywhere the frontend still says `PlannedWorkout` should be renamed to `Workout`.

**API details**
Changed coach routes:
- `GET /v1/coach/training_plans/{plan_id}/planned_workouts` -> `GET /v1/coach/training_plans/{plan_id}/workouts`
- `POST /v1/coach/training_plans/{plan_id}/planned_workouts` -> `POST /v1/coach/training_plans/{plan_id}/workouts`
- `GET /v1/coach/planned_workouts/{id}` -> `GET /v1/coach/workouts/{id}`
- `PATCH /v1/coach/planned_workouts/{id}` -> `PATCH /v1/coach/workouts/{id}`
- `DELETE /v1/coach/planned_workouts/{id}` -> `DELETE /v1/coach/workouts/{id}`
- `POST /v1/coach/planned_workouts/{id}/duplicate` -> `POST /v1/coach/workouts/{id}/duplicate`

**Before**
```json
{
  "data": {
    "planned_workouts": [
      {
        "id": "...",
        "name": "Push Day"
      }
    ]
  }
}
```

**After**
```json
{
  "data": {
    "workouts": [
      {
        "id": "...",
        "name": "Push Day"
      }
    ]
  }
}
```

**Status codes**
- `200`, `201`, `204` on success
- `404` if the workout or plan is not found or belongs to another business
- `422` for validation failures

**Frontend impact (action items)**
- Rename domain types and response types from `PlannedWorkout` to `Workout`.
- Replace route constants and RTK Query bindings from `/planned_workouts` to `/workouts`.
- Update fixtures, mocks, Storybook stories, and frontend copy that still says `planned workout`.
- Likely files to touch: `types/training.ts`, training API slice, coach training-plan builder screens, and tests.

**Example**
```bash
# Before
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/planned_workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Push Day","notes":"Heavy"}'

# After
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/workouts" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Push Day","notes":"Heavy"}'
```

---

### Change 2: Training plan payloads now separate reusable workouts from day assignments

**Type:** modified endpoint, schema change, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "TrainingPlan -> Workout (reusable content: exercises + sets)"
>
> "TrainingPlan -> PlanItem (schedule: which Workout on which day + slot)"

**Breaking:** Yes

**What changed in the backend**
Coach and client training plan responses now return two coordinated collections: `workouts` for workout content and `plan_items` for the weekly schedule. The schedule is no longer stored on the workout itself.

**What the frontend will observe**
The frontend can no longer render a weekly plan by reading a `day_number` directly off each workout. To build weekly views or a Today card, it must resolve `plan_items[].workout_id` against `workouts[]` and then group or filter by `plan_items[].day`.

**API details**
Affected endpoints:
- `GET /v1/coach/training_plans/{id}`
- `GET /v1/coach/training_plans`
- `GET /v1/coach/clients/{client_id}/training_plans`
- `GET /v1/client/training_plans/{id}`
- `GET /v1/client/training_plans`

**Before**
```json
{
  "data": {
    "id": "plan-1",
    "planned_workouts": [
      {
        "id": "workout-1",
        "name": "Push Day",
        "day_number": 1
      }
    ],
    "rest_days": [7]
  }
}
```

**After**
```json
{
  "data": {
    "id": "plan-1",
    "workouts": [
      {
        "id": "workout-1",
        "name": "Push Day",
        "notes": "Heavy bench focus",
        "workout_elements": []
      }
    ],
    "plan_items": [
      {
        "id": "item-1",
        "day": "monday",
        "workout_type": "primary",
        "workout_id": "workout-1",
        "training_plan_id": "plan-1"
      }
    ],
    "rest_days": ["sunday"]
  }
}
```

**Status codes**
- `200` on success
- `404` for missing or cross-business plans

**Frontend impact (action items)**
- Update `getTrainingPlan` and `listTrainingPlans` response types for both coach and client apps.
- Rebuild weekly schedule selectors to use `plan_items` as the source of day assignment.
- Update Today screen resolution logic: match today’s weekday string to `plan_items.day`, then join to `workouts`.
- Update empty-day and rest-day rendering logic to distinguish `plan_items` from `rest_days`.
- Likely files to touch: training plan builder, plan detail screen, Today screen, client plan viewer, and selectors/hooks around plan normalization.

**Example**
```bash
# After
curl "$API/v1/client/training_plans/$PLAN_ID" \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

---

### Change 3: Add `training_plan_items` schedule endpoints and `copy-day`

**Type:** new endpoint, schema change, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "New entity `Training.PlanItem` mirrors `Nutrition.PlanItem`."
>
> "Copy day is trivial ... copy PlanItems, not deep-copy Workouts."

**Breaking:** Yes

**What changed in the backend**
The backend added a new `Training.PlanItem` entity and new coach endpoints for schedule CRUD plus `copy-day`. These endpoints are now the API for assigning a workout to a day, moving it between days, removing a day assignment, or duplicating one day’s schedule to another.

**What the frontend will observe**
The builder can no longer treat "create workout" as "create scheduled day". Scheduling is now a second step. The frontend should create a workout in the workout library first, then create one or more training plan items that point to it.

**API details**
New endpoints:
- `POST /v1/coach/training_plans/{plan_id}/training_plan_items`
- `GET /v1/coach/training_plans/{plan_id}/training_plan_items`
- `PATCH /v1/coach/training_plan_items/{id}`
- `DELETE /v1/coach/training_plan_items/{id}`
- `POST /v1/coach/training_plans/{id}/copy-day`

Create request:
```json
{
  "day": "monday",
  "workout_type": "primary",
  "workout_id": "workout-1"
}
```

Create response (`201`):
```json
{
  "data": {
    "id": "item-1",
    "day": "monday",
    "workout_type": "primary",
    "workout_id": "workout-1",
    "training_plan_id": "plan-1",
    "creator_id": "coach-1",
    "business_id": "business-1",
    "inserted_at": "2026-04-21T10:30:00Z",
    "updated_at": "2026-04-21T10:30:00Z"
  }
}
```

Copy-day request:
```json
{
  "source_day": "monday",
  "target_day": "thursday"
}
```

Copy-day response (`201`):
```json
{
  "data": [
    {
      "id": "item-2",
      "day": "thursday",
      "workout_type": "primary",
      "workout_id": "workout-1",
      "training_plan_id": "plan-1"
    }
  ]
}
```

**Status codes**
- `200` for list and update
- `201` for create and copy-day
- `204` for delete
- `404` if plan, workout, or item is not found or not in the same business
- `422` for invalid `day` or invalid `workout_type`
- `201` with `data: []` from copy-day if `source_day` is valid but has no scheduled items

**Frontend impact (action items)**
- Add `TrainingPlanItem` type and CRUD API bindings.
- Build schedule assignment UI around these endpoints instead of mutating workouts directly.
- Add copy-day UI that calls `POST /copy-day` and then refetches plan data.
- Update optimistic update logic to treat plan items as schedule rows, not workout records.
- Likely files to touch: weekly schedule grid, drag/drop day assignment, schedule modals, and plan-builder mutations.

**Example**
```bash
# Assign an existing workout to Monday
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/training_plan_items" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"day":"monday","workout_type":"primary","workout_id":"'$WORKOUT_ID'"}'

# Copy Monday's schedule to Thursday
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/copy-day" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source_day":"monday","target_day":"thursday"}'
```

---

### Change 4: Replace weekday integers with weekday strings

**Type:** schema change, behavior change, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "`day` is a string (`\"monday\"` not integer 1)."
>
> "`rest_days` changes from `{:array, :integer}` to `{:array, :string}`."

**Breaking:** Yes

**What changed in the backend**
Weekdays are now represented by lowercase strings everywhere in the training planning API. `day_number` was removed from workouts, training plan items use `day`, and `rest_days` changed from `integer[]` to `string[]`.

**What the frontend will observe**
Any frontend code that maps `1..7` to weekday labels is now wrong for training plans. Form controls, client-side types, filters, sorting helpers, and rest-day state must all switch to string-based weekday values.

**API details**
`rest_days` field:

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

Workout create request:

**Before**
```json
{
  "name": "Push Day",
  "day_number": 1,
  "notes": "Heavy bench"
}
```

**After**
```json
{
  "name": "Push Day",
  "notes": "Heavy bench"
}
```

**Status codes**
- `422` for invalid weekday strings on plan-item create/update and training-plan rest-day updates

**Frontend impact (action items)**
- Replace `day_number: number` with `day: string` and `rest_days: string[]` in TypeScript models.
- Replace integer-based weekday selects or sort helpers with string-based weekday enums.
- Update any memoized planner buckets keyed by numbers to use weekday strings.
- Likely files to touch: date helpers, training types, rest-day picker, weekly planner columns, and tests.

**Example**
```bash
# Before
{"day_number":4}

# After
{"day":"thursday"}
```

---

### Change 5: Rename `planned_workout_id` to `workout_id` in workout elements and workout sessions

**Type:** schema change, modified endpoint, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "Column rename: `planned_workout_id` -> `workout_id`"

**Breaking:** Yes

**What changed in the backend**
The parent foreign key on `WorkoutElement` and `WorkoutSession` is now `workout_id`. Coach and client workout-session create endpoints, workout-element create responses, and session responses all expose the new key.

**What the frontend will observe**
Requests that still send `planned_workout_id` will not bind to the new backend shape. Session-start flows and workout-element creation flows must now send `workout_id`. Session and element response parsing must also read `workout_id`.

**API details**
Affected request payloads:
- `POST /v1/coach/workout_elements`
- `POST /v1/coach/workout_sessions`
- `POST /v1/client/workout_sessions`

**Before**
```json
{
  "planned_workout_id": "workout-1"
}
```

**After**
```json
{
  "workout_id": "workout-1"
}
```

Session response field:

**Before**
```json
{
  "data": {
    "planned_workout_id": "workout-1",
    "planned_snapshot": {"workout_name":"Push Day"}
  }
}
```

**After**
```json
{
  "data": {
    "workout_id": "workout-1",
    "planned_snapshot": {"workout_name":"Push Day"}
  }
}
```

**Status codes**
- `201` on create
- `404` if the referenced workout is not found or belongs to another business
- `422` for validation failures

**Frontend impact (action items)**
- Rename `planned_workout_id` to `workout_id` across request builders, response types, and selectors.
- Update the Today screen or active-workout start mutation to send resolved workout ids, not plan-item ids.
- Update session fixtures and API mocks for both coach and client apps.
- Likely files to touch: workout-session API slice, active workout screen, coach builder exercise editor, and integration tests.

**Example**
```bash
# Before
curl -X POST "$API/v1/client/workout_sessions" \
  -d '{"planned_workout_id":"'$WORKOUT_ID'"}'

# After
curl -X POST "$API/v1/client/workout_sessions" \
  -d '{"workout_id":"'$WORKOUT_ID'"}'
```

---

### Change 6: Duplicate workout no longer schedules a day; schedule duplication moved to `copy-day`

**Type:** behavior change, modified endpoint, breaking change
**Spec reference:** From `docs/specs/training-plan-redesign-2026-04-21.md`:
> "Copy day is trivial ... copy PlanItems, not deep-copy Workouts."
>
> "The day assignment moves out."

**Breaking:** Yes

**What changed in the backend**
`POST /v1/coach/workouts/{id}/duplicate` now duplicates workout content and nested workout elements only. It does not accept or apply any day assignment. If the frontend wants that duplicated workout to appear on a day, it must create a training plan item separately. If the frontend wants to copy a day’s schedule without deep-copying workouts, it should use `POST /v1/coach/training_plans/{id}/copy-day`.

**What the frontend will observe**
Old duplicate flows that bundled "duplicate this workout onto Thursday" into one call no longer exist. The action must now be modeled as either:
- duplicate workout content, then separately assign it to a day, or
- copy a day’s schedule references without duplicating content.

**API details**
Duplicate workout:

**Before**
```json
POST /v1/coach/planned_workouts/{id}/duplicate
{
  "day_number": 4
}
```

**After**
```json
POST /v1/coach/workouts/{id}/duplicate
{}
```

Current response (`201`):
```json
{
  "data": {
    "id": "new-workout-id",
    "name": "Push Day",
    "training_plan_id": "plan-1",
    "workout_elements": [
      {
        "id": "new-element-id",
        "workout_id": "new-workout-id"
      }
    ]
  }
}
```

**Status codes**
- `201` on duplicate success
- `404` if the source workout is not found or belongs to another business

**Frontend impact (action items)**
- Remove day-selection assumptions from the duplicate-workout action.
- If the UX says "duplicate and place on Thursday," implement two calls: duplicate workout, then create a plan item for Thursday.
- Use `copy-day` when the desired UX is "reuse the same workout(s) on another day" instead of "create new workout copies."
- Likely files to touch: duplicate workout modal, schedule actions menu, and builder command handlers.

**Example**
```bash
# Duplicate workout content only
curl -X POST "$API/v1/coach/workouts/$WORKOUT_ID/duplicate" \
  -H "Authorization: Bearer $TOKEN"

# Then assign the duplicated workout to Thursday
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/training_plan_items" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"day":"thursday","workout_type":"primary","workout_id":"'$NEW_WORKOUT_ID'"}'
```

---

## Migration checklist for frontend

- [ ] Rename all `PlannedWorkout` types, hooks, selectors, and UI labels to `Workout`.
- [ ] Replace all `/planned_workouts` API paths with `/workouts`.
- [ ] Update training plan response parsing to use `workouts` and `plan_items` together.
- [ ] Add `TrainingPlanItem` types and coach API bindings for create/list/update/delete.
- [ ] Add a `copy-day` mutation for the coach schedule UI.
- [ ] Remove `day_number` from all payloads, types, sorting helpers, and UI state.
- [ ] Migrate `rest_days` handling from `number[]` to `string[]`.
- [ ] Rename all `planned_workout_id` usage to `workout_id`.
- [ ] Update workout-session start flows to resolve a workout via `plan_items[].workout_id`.
- [ ] Update duplicate-workout UI to separate "duplicate content" from "assign to a day".
- [ ] Update fixtures, mocks, Storybook stories, and end-to-end tests for coach and client training screens.
- [ ] Add schedule selectors that bucket `plan_items` by weekday string.
- [ ] Add empty-state UX for `copy-day` returning `201` with `data: []` when the source day has no scheduled items.

---

## Things that did NOT change

- `WorkoutElement` still contains `position`, `superset_group_id`, `notes`, `exercise`, and embedded `planned_sets`. Only the parent foreign-key name changed.
- `PerformedSet` endpoints and payload semantics are unchanged.
- Authentication, authorization, and business scoping are unchanged.
- Workout-session lifecycle is unchanged: start, update, complete, and discard still behave the same.
- `planned_snapshot` is still named `planned_snapshot`; only the session’s foreign-key field changed to `workout_id`.
- Nutrition endpoints and nutrition plan architecture are unchanged.

---

## Open questions / known gaps

- **Spec drift: rest-day overlap validation is not implemented.** The spec says `rest_days` should not overlap with days that have `plan_items`, but the shipped backend only validates valid day names and duplicate entries.
- **Contract drift: `PATCH /v1/coach/training_plan_items/{id}` documents `workout_id`, but the backend update changeset currently only applies `day` and `workout_type`.** Frontend should treat re-linking a plan item to a different workout as unsupported for now.
- **Contract example drift: `docs/api_contract.yaml` currently shows `workout_type: strength` and `workout_type: cardio` in some `training_plan_items` examples, but the backend validates only `primary` and `alternative`.** Frontend should use `primary` and `alternative` only.
- **Alternative workout UI is still a frontend product decision.** Backend supports `workout_type: "alternative"`, but no client-facing selection UX shipped as part of this backend work.
- **`copy-day` with a valid but empty source day returns `201` and an empty list.** If the frontend wants a stronger warning, it needs to detect `data.length === 0` and show one client-side.
