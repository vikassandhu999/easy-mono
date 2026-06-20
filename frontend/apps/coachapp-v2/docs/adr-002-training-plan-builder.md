# ADR-002: Training plan builder

> **⚠️ Status (2026-06-20): the in-app training-plan builder has been removed from coachapp-v2.** The interactive builder UI (`weekly-overview`, `workout-section`, `inline-exercise-form`, `exercise-element`, `exercise-picker`, `workout-name-form`, `unit-picker`) and the workout / plan-item / workout-element CRUD endpoints were deleted; the training-plan detail view is now read-only (create / list / assign / delete still work, but no in-app workout or exercise editing). The components and endpoints remain in git history. This document is retained as the design of record.

**Date:** 2026-03-29
**Last updated:** 2026-06-19
**Status:** Accepted for the coach-app surface that exists today. The backend training-context refactor in `docs/superpowers/specs/2026-05-31-training-context-refactor-design.md` supersedes several data-model choices but has not been reflected in the coach app API types yet.

## Why this ADR was rewritten

The previous version mixed four different things:

* The routed coach-app training-plan pages.
* Deleted builder experiments and long v2/v3 changelog notes.
* Client-app workout logging details.
* A later backend target model that removes parts of the live API.

That made the document hard to trust. This ADR records the coach-app implementation and the live API contract separately from the target backend refactor.

## Product decision

Training plans are weekly recurring coaching plans. Do not build a calendar-periodization engine, `plan_weeks`, `plan_days`, or recurrence-rule support for this feature.

Coaches author training plans. Clients execute workouts and log results. The coach app owns template creation, client assignment, plan editing, and workout history review. Client workout execution belongs in `clientapp-v2` or in the cross-stack training-context spec, not in this coach-app ADR.

## Implemented data model

The coach app still follows the live contract in `frontend/apps/coachapp-v2/src/api/trainingPlans.ts` and `frontend/apps/coachapp-v2/docs/api_contract.yaml`.

The implemented `TrainingPlan` shape is:

```text
TrainingPlan
  id
  name
  description
  status: active | archived
  start_date
  end_date
  client_id
  client
  original_template_id
  rest_days[]
  workouts[]
  plan_items[]
```

Templates are inferred with `client_id == null`. Personal plans have `client_id` set. There is no `kind` field in the coach app yet.

The implemented weekly schedule shape is:

```text
TrainingPlanItem
  day: monday | tuesday | ... | sunday
  workout_type: primary | alternative
  workout_id
```

`rest_days` is still part of the API. A day is rendered as:

* assigned when at least one `plan_item` exists for the day
* rest when there is no item and the day is in `rest_days`
* empty otherwise

The target backend refactor removes `rest_days`, renames `workout_type` to `role`, adds `position`, and allows richer same-day ordering. The coach app should not pretend those fields exist until the API changes.

Workout prescriptions still store `planned_sets` as an inline array on `WorkoutElement`. The coach-facing UI uses one target per exercise and serializes N identical planned-set entries when the coach enters N sets.

## Target backend direction

The accepted target direction is the clean-break weekly recurrence spec:

```text
training_plan_template
  -> copied client_training_plan
    -> weekly training_plan_items
    -> workouts
      -> workout_elements
        -> planned_sets

active client_training_plan
  -> materialized scheduled_workouts for current/past days
    -> workout_sessions
      -> performed_exercises
        -> performed_sets
```

Important differences from the implemented coach-app contract:

* `training_plans.kind` becomes `template | client_plan`.
* `source_template_id` replaces `original_template_id`.
* `starts_on` and `ends_on` replace `start_date` and `end_date`.
* `rest_days` is deleted. A weekday without a plan item is rest.
* `training_plan_items.workout_type` becomes `role`.
* `training_plan_items.position` controls same-day order.
* `planned_sets` becomes a real table with stable IDs.
* `scheduled_workouts` and `scheduled_workout_events` handle current and historical workout occurrences.

Until that refactor lands, frontend work must continue to match the live RTK Query types and `api_contract.yaml`.

## Routed coach-app pages

`frontend/apps/coachapp-v2/src/router.tsx` wires these pages:

```text
/library/training-plans
  -> training-plans/list-training-plans.tsx

/library/training-plans/create
  -> training-plans/create-training-plan.tsx

/library/training-plans/:id
  -> training-plans/plan-builder/plan-builder.tsx

/library/training-plans/:id/edit
  -> training-plans/edit-training-plan.tsx
```

List uses `useTrainingPlansInfiniteQuery({search})` and opens plans through `ROUTES.TRAINING_PLAN_DETAIL`.

Create uses `TrainingPlanForm` with:

* `name`
* `description`
* `start_date`
* `end_date`

On successful create, it navigates to `/library/training-plans/:id` with `{replace: true}`.

Edit reuses the same form and writes the same metadata fields.

## Builder page state

The routed detail page is `training-plans/plan-builder/plan-builder.tsx`.

It currently does these things:

* Fetches the aggregate with `useGetTrainingPlanQuery(id)`.
* Shows loading and error states.
* Shows the Back button, plan title, description, status chip, Template chip, and dates.
* Shows `PlanAddToClient`.
* Shows `PlanActions` for archive, restore, and delete.
* Renders placeholder weekly schedule and workout sections.
* Shows created and updated timestamps.

It does not currently render `WeeklyOverview`, `WorkoutSection`, `ClientPlanBanner`, or the inline workout/exercise builder. The old ADR described those as if they were part of the routed page. They are not wired into the active route.

## Builder components

These files exist and can be reused when the builder is wired back together:

* `components/weekly-overview/weekly-overview.tsx` contains the fuller weekly schedule UI and delegates derivation helpers to `src/domain/training-weekly-overview.ts`.
* `components/weekly-overview.tsx` is an older duplicate weekly overview implementation with local derivation logic.
* `components/workout-section.tsx` contains workout rename, notes editing, duplicate/delete, exercise add/edit, copy exercise, and remove-with-undo flows.
* `components/inline-exercise-form.tsx` is the one-target-per-exercise form.
* `components/exercise-element.tsx` shows and edits one workout element.
* `components/unit-picker.tsx` is a popover-based load-unit picker.

There should be one weekly overview implementation. Keep the domain-helper version and delete the older duplicate when the builder is wired.

## API endpoints used by coach app

Training plan endpoints:

```text
GET    /v1/coach/training_plans
POST   /v1/coach/training_plans
GET    /v1/coach/training_plans/:id
PATCH  /v1/coach/training_plans/:id
DELETE /v1/coach/training_plans/:id
POST   /v1/coach/training_plans/:id/assign
POST   /v1/coach/training_plans/:id/duplicate
GET    /v1/coach/clients/:client_id/training_plans
```

Workout and schedule endpoints:

```text
POST   /v1/coach/training_plans/:plan_id/workouts
GET    /v1/coach/training_plans/:plan_id/workouts
GET    /v1/coach/workouts/:id
PATCH  /v1/coach/workouts/:id
DELETE /v1/coach/workouts/:id
POST   /v1/coach/workouts/:id/duplicate

POST   /v1/coach/training_plans/:plan_id/training_plan_items
GET    /v1/coach/training_plans/:plan_id/training_plan_items
PATCH  /v1/coach/training_plan_items/:id
DELETE /v1/coach/training_plan_items/:id

POST   /v1/coach/workout_elements
GET    /v1/coach/workout_elements/:id
PATCH  /v1/coach/workout_elements/:id
DELETE /v1/coach/workout_elements/:id
```

Coach workout-history endpoints:

```text
GET /v1/coach/workout_sessions
GET /v1/coach/workout_sessions/:id
```

The coach app has RTK Query hooks for listing and viewing workout sessions. Workout-session creation, completion, and discard flows are not coach-app builder responsibilities.

## Cache decisions

`useGetTrainingPlanQuery(id)` is the aggregate bootstrap query for the builder.

Builder mutations patch the cached aggregate after confirmed server responses:

* workout create/update/duplicate/delete
* training-plan-item create/update/delete
* workout-element create/update/delete

This keeps nested edits responsive without refetching the whole plan after every change.

List-scope mutations still invalidate list tags:

* `TrainingPlan/LIST` for the library
* `TrainingPlan/CLIENT_LIST` for client detail pages
* the destination `Client` tag when assigning a plan

`TrainingPlanItemUpdateRequest` intentionally does not include `workout_id`. The backend only applies `day` and `workout_type` on patch, so changing which workout a day points to must delete and recreate the plan item.

## Open work

The builder is not feature-complete in the routed page:

* Wire `WeeklyOverview` into `plan-builder/plan-builder.tsx` or delete the unused weekly overview components.
* Wire `WorkoutSection` into the builder or delete the unused workout/exercise builder components.
* Delete the duplicate `components/weekly-overview.tsx` after keeping the domain-helper version.
* Make `PlanAddToClient` call `useAssignTrainingPlanMutation`; it currently opens a client picker and closes it on selection.
* Wire the Edit and Copy menu items in `PlanActions`, or remove them from the menu until they work.
* Show `ClientPlanBanner` for personal plans if training plans should match nutrition plans.
* Reconcile the coach app with the clean-break backend spec when the backend model changes.

## Ponytail audit

delete: client-app workout logging deep dive from this coach-app ADR. Replacement: keep it in the client app or the cross-stack training-context spec. [frontend/apps/coachapp-v2/docs/adr-002-training-plan-builder.md]

delete: deleted v2/v3 experiment changelog from the ADR body. Replacement: keep only the active one-target-per-exercise decision and git history for old attempts. [frontend/apps/coachapp-v2/docs/adr-002-training-plan-builder.md]

yagni: two weekly overview implementations. Replacement: one implementation, preferably `components/weekly-overview/weekly-overview.tsx` plus `src/domain/training-weekly-overview.ts`. [frontend/apps/coachapp-v2/src/training-plans/components/weekly-overview.tsx]

yagni: described-but-unwired builder components. Replacement: wire them into `plan-builder/plan-builder.tsx` or delete them. [frontend/apps/coachapp-v2/src/training-plans/components/]

net: -400 lines possible in the ADR, -0 deps possible.
