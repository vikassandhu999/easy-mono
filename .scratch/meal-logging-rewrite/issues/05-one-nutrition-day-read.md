# One nutrition-day read

Type: AFK
Status: resolved

## Parent

[Meal logging diary](../spec.md)

## Design constraints

Read the spec Design brief before coding.

Must discard: opaque `NutritionMapResponse`; hand-typed `asTodayPlan`; today plan map plus meal-log list plus frontend join.

Must delete or replace: the opaque today map type and `asTodayPlan`. Emit the nutrition-day payload from the Design brief (`date`, `targets`, `slots[]` with `options[]` and `rows[]` of `status`, `planned?`, `entry?`). Both apps read it. Coach never joins.

## What to build

Client and coach load a documented nutrition-day (and date-range) payload instead of an opaque today map plus a raw meal-log list. Each slot carries live options, planned and logged calories, and diary rows with status. History rings and the coach 14-day tab use the same range read. The opaque today map type is deleted.

## Acceptance criteria

- [x] The day payload is an OpenAPI schema, not an untyped object: date, targets, slots with options, calories, and diary rows (status, planned item, entry).
- [x] Client Today uses this read. The hand-typed today map helper is gone.
- [x] Coach nutrition day and 14-day tab use this read (or its range form). They do not join snapshots to entries in the app.
- [x] Client history week rings use the range form and the same consumed totals as the day view.
- [x] Past dates use diary rows for plan-versus-actual. Live options do not replace a freeze.
- [x] OpenAPI is regenerated; both apps consume the generated types.

## Blocked by

- [Client Today follows the diary freeze](./02-client-today-follows-the-diary-freeze.md)

## Answer

Added `GET /nutrition-days` (client) and `GET /clients/:id/nutrition-days` (coach) returning `NutritionDay` (`date`, `plan_id`, `targets`, `slots` with live `options` + diary `rows`). Removed opaque `NutritionMapResponse` / `nutrition-plans/today`. Client Today, history, and home consume the day payload; coach day + 14-day tab use the same read. `asTodayPlan` / `buildDaySlots` join deleted; thin `slotsFromDay` only overlays unsaved option picks.

Verified: `mix precommit` (1143/0), `just gen-api`, client + coach builds. Dinner-bug regression: log planned meal → five `as_planned`, zero added/skipped.
