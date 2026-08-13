# Typed diary write verbs

Type: AFK
Status: resolved

## Parent

[Meal logging diary](../spec.md)

## Design constraints

Read the spec Design brief before coding.

Must discard: one `FoodLogEntryRequest` for create, log-meal, and log-day.

Must delete or replace: kitchen-sink request fields (`source`, `plan_id` on single-item create). Each verb in the Design brief write table gets its own body. Amount sheet talks in `planned_item_id` plus portion, not `source: planned`. URLs may stay verb-style.

## What to build

Each diary write has its own request body. The client amount sheet, picker, log-meal, log-day, and switch-option call those verbs and do not send `source` or unused create fields. Replace is one verb that fulfils a planned item with a different food or recipe and never leaves two entries on the same id.

## Acceptance criteria

- [x] Log planned item, log meal, log day, replace item, add extra, update portion, remove entry, and switch option each have a documented request schema (not one kitchen-sink body).
- [x] Client logging flows stop sending `source` and stop sending `plan_id` on a single-item create.
- [x] Replace leaves exactly one entry on that planned item id, status `swapped`.
- [x] A recipe with no cooked weight rejects gram sizing and accepts servings.
- [x] A food logs by weight. Macros freeze at write time.
- [x] OpenAPI is regenerated; both apps consume the generated types.
- [x] Failed writes leave the slot unchanged. Last-active still stamps on successful log writes.
- [x] A client without a plan can still add extras to a slot.

## Blocked by

- [Show a logged planned meal without duplicate chips](./01-show-logged-planned-meal-without-duplicate-chips.md)

## Answer

Split kitchen-sink `FoodLogEntryRequest` into per-verb OpenAPI bodies and routes: `log-planned-item`, `add-extra`, `replace-item`, `log-meal`, `log-day`, portion PATCH, delete, switch-option. MealLogs exposes matching client verbs; log-planned fills food/recipe from the freeze; replace atomically drops then inserts one fulfilment on that planned id. Client Today / amount sheet / picker call those verbs and no longer send `plan_id` or `meal_item_id` on writes.

Verified: `mix precommit` (1143/0), `just gen-api`, clientapp build.
