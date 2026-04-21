# Frontend Handover Addendum: Training Plan Redesign — Review Fixes

**Date:** 2026-04-21 (addendum, same day as original handover)
**Original handover:** `docs/handovers/2026-04-21-training-plan-redesign-handover.md`
**Spec:** `docs/specs/training-plan-redesign-2026-04-21.md`
**Breaking change from the previous handover:** Yes — one new constraint, one endpoint removed.
**Migration urgency:** Same as original (immediate). If you already cut a PR against the original handover, these two changes need to go in before release.

---

## TL;DR

Two corrections to what was handed over earlier today:

1. **Uniqueness enforced on `TrainingPlanItem`.** Only one PlanItem per `(training_plan_id, day, workout_type)` is allowed. Creating a second `primary` workout on Monday now returns **422**, not 201.
2. **`POST /v1/coach/training_plans/{id}/copy-day` is REMOVED.** It was in the original handover. It's gone. Don't implement it. Workouts are already reusable across days via PlanItems — that's the whole point of the redesign. No "copy day" is needed.

Everything else in the original handover still stands.

---

## Change A: `TrainingPlanItem` uniqueness on (plan, day, workout_type)

**Type:** new constraint, new error surface
**Breaking:** Yes, for any flow that might produce duplicates
**Spec reference:** `docs/specs/training-plan-redesign-2026-04-21.md`
> "A coach can put two PlanItems on the same day — one primary, one alternative"

### What changed in the backend

A unique DB index and a matching `unique_constraint` were added on `(training_plan_id, day, workout_type)`. The `POST /v1/coach/training_plans/{plan_id}/training_plan_items` endpoint will now return **422** when the coach tries to create a second PlanItem with the same `workout_type` on the same `day` in the same plan. Same rule applies to `PATCH /v1/coach/training_plan_items/{id}` when a day/type update would collide.

### What the frontend will observe

A coach drags a second workout onto Monday's "primary" slot — the backend now rejects it. Before this change, the API would accept it and leave two primary workouts on Monday, which the spec never intended.

### API details

No route/path changes. Request/response shapes unchanged. The only difference is a new 422 response:

```json
POST /v1/coach/training_plans/{plan_id}/training_plan_items
{ "day": "monday", "workout_type": "primary", "workout_id": "..." }

// When a primary already exists on monday:
HTTP/1.1 422 Unprocessable Entity
{
  "error": {
    "code": "invalid_input",
    "message": "The data provided was invalid.",
    "detail": {
      "fields": {
        "training_plan_id": ["already has a workout of this type on this day"]
      }
    }
  }
}
```

Note the error is keyed under `training_plan_id` because Ecto's `unique_constraint` reports on the first field in the composite index. Don't parse it as "the plan id is wrong." Treat the specific message as the signal.

### Frontend impact (action items)

- **Handle 422 on PlanItem create and update.** Show an inline error like "Monday already has a primary workout."
- **If your UI supports drag-to-assign**, block the drop client-side when the target day+type is already occupied. The server-side check is still authoritative, but a client check saves a round-trip.

### Allowed values reminder

`workout_type` is one of: `"primary"`, `"alternative"`. Any other string (e.g. `"strength"`, `"cardio"` — which appeared in earlier API contract examples) will now 422 with `workout_type: ["is invalid"]`. The API contract examples have been corrected; refresh the yaml if you cached it.

For MVP only `"primary"` is used. `"alternative"` is reserved for a later iteration — the constraint supports it but no frontend surface is planned yet.

### Manual verification

```bash
# First insert succeeds
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/training_plan_items" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"day":"monday","workout_type":"primary","workout_id":"'$W1'"}'
# => 201

# Second with same day+type fails
curl -X POST "$API/v1/coach/training_plans/$PLAN_ID/training_plan_items" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"day":"monday","workout_type":"primary","workout_id":"'$W2'"}'
# => 422, fields.training_plan_id: ["already has a workout of this type on this day"]
```

---

## Change B: `copy-day` endpoint REMOVED

**Type:** removed endpoint
**Breaking:** Yes (if you already built against the original handover)
**Rationale:** Doesn't fit the training architecture.

### What changed in the backend

- `POST /v1/coach/training_plans/{id}/copy-day` — route deleted.
- `EasyWeb.Coaches.TrainingPlanController.copy_day/2` — action deleted.
- `Easy.Training.TrainingPlan.copy_day/5` + helpers — deleted.
- All copy-day tests — deleted.
- `docs/api_contract.yaml` — path entry deleted.

### Why

The copy-day operation existed for nutrition because meals are per-day and per-slot, so coaches frequently need to replicate Monday's breakfast/lunch/dinner structure onto Tuesday. Training in the new architecture doesn't need it: a single `Workout` is already shared across multiple days by creating multiple PlanItems pointing at the same `workout_id`. The use case "make Thursday the same as Monday" is a single PlanItem insert, not a day-copy operation.

The original handover documented copy-day because it existed in the initial implementation. On review we decided it's the wrong primitive for training. It's gone. Frontend should not build a copy-day UI for training plans.

### Frontend impact

- **Delete any copy-day API binding, route, or UI** you already built for training. The endpoint will 404.
- **For the "I want Thursday to look like Monday" case**, your UI should call `POST /v1/coach/training_plans/{plan_id}/training_plan_items` for each PlanItem on Monday, substituting `day: "thursday"`. This is one call per PlanItem — for MVP with only `primary` workouts it's typically one call.
- **Do not assume a bulk-copy endpoint is coming.** Nutrition's copy-day is nutrition-specific.

### "Used on" indicator — already computable client-side

Related UX note from the spec: each Workout card shows "Used on: Mon, Thu" — the list of days that Workout is assigned to. This is computed client-side from the `plan_items[]` array already returned in `GET /training_plans/{id}`:

```
plan_items
  |> filter(item => item.workout_id === workout.id)
  |> map(item => item.day)
  |> sort by weekday
```

No backend endpoint needed.

---

## Updated checklist (delta only)

Add these to whatever checklist you built from the original handover:

### PlanItem uniqueness

- [ ] Handle 422 from `POST /training_plan_items` and surface the field error (`training_plan_id` key, message containing "already has a workout of this type on this day") as a user-friendly message.
- [ ] Handle 422 from `PATCH /training_plan_items/:id` when editing `day` would collide with an existing PlanItem.
- [ ] (Optional) Pre-check in the UI before submit: if the coach already has a `primary` on this day, disable adding another `primary`.

### copy-day

- [ ] Remove any copy-day API binding, hook, or route from the training plan frontend.
- [ ] For "make this day the same as another day" UX, multi-call `POST /training_plan_items` once per source PlanItem.
- [ ] Compute "Used on" indicator client-side from `plan_items[]` filtered by `workout_id`.

### Alternative workouts UI

- [ ] **Do not build it for MVP.** Confirmed with product. The data model supports `workout_type: "alternative"` but no UI work is planned this iteration. Frontend should only render/allow `workout_type: "primary"` in create/edit flows.

---

## What did NOT change from the original handover

- Route paths for Workout, PlanItem (CRUD), WorkoutSession, WorkoutElement — unchanged.
- Request/response shapes for Workout, TrainingPlan, WorkoutSession — unchanged.
- `day_number` → `day` (string) migration — unchanged.
- `rest_days` as `string[]` — unchanged.
- Snapshot field `planned_snapshot` on WorkoutSession — unchanged.
- `workout_id` vs `planned_workout_id` rename — unchanged.

If you already finished the rename work from the original handover, the deltas are: (1) handle the new 422, (2) delete any copy-day plumbing, (3) don't build alternatives UI.

---

## Contract reference

Changes to `docs/api_contract.yaml`:

- `/v1/coach/training_plans/{id}/copy-day` — **removed**.
- `TrainingPlanItem.workout_type` enum restricted to `primary` / `alternative` in examples. Earlier examples with `strength` / `cardio` were wrong and are gone.

If your codegen picks up the yaml, regenerate clients after pulling this branch and any bindings for `copyTrainingPlanDay` will disappear — that's expected.

---

## Open questions — resolved

1. ~~Copy-day UX default (replace vs merge)~~ — moot, endpoint removed.
2. **"Used on" badge.** Computed client-side from `plan_items[]`. No backend change.
3. **Alternative workouts UI.** Not in MVP. Only `primary` is rendered/editable for now.
