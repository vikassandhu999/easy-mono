# Diary fulfilments survive builder deletes

Type: AFK
Status: resolved

## Parent

[Meal logging diary](../spec.md)

## Design constraints

Read the spec Design brief before coding.

Must discard: `source` as a second identity; `nutrition_meal_item_id` foreign key that SET NULLs on meal-item delete.

Must delete or replace: `source` on schema, OpenAPI, and JSON. Store `planned_item_id` as a uuid that survives builder deletes. Switch-option deletes by planned item id, not by `source`.

## What to build

A fulfilment is identified by the frozen planned item id stored on the entry as a uuid that does not null out when the builder meal item is deleted. `source` is removed. Switch-option deletes entries that have a planned item id and keeps extras. Unique-one-fulfilment-per-id remains a database guarantee. New logs always freeze ids; existing snapshots get a best-effort backfill.

## Acceptance criteria

- [x] Deleting a builder meal item after a log leaves the diary row readable and still fulfilling that frozen id (not turned into an extra, not 500).
- [x] `source` is gone from schema, API, and writes. Status and switch-option use planned item id only.
- [x] Switch-option replaces the freeze, drops fulfilments, keeps extras. Switching to the already pinned meal does nothing.
- [x] At most one entry per meal log may carry a given planned item id.
- [x] New logs freeze planned item ids on snapshot items. Historical snapshots without a recoverable id may skip-match imperfectly.

## Blocked by

- [Show a logged planned meal without duplicate chips](./01-show-logged-planned-meal-without-duplicate-chips.md)

## Answer

Replaced `nutrition_meal_item_id` FK (ON DELETE SET NULL) with `planned_item_id` uuid and no FK. Dropped `source` from schema, OpenAPI, JSON, and client writes. Switch-option deletes where `planned_item_id` is set and keeps extras. Unique index is `(meal_log, planned_item_id)`. Snapshot backfill stamps missing freeze ids from the pinned meal by food name. Builder delete after log keeps the fulfilment id and `as_planned` status.

Verified: `mix ecto.migrate`, `mix precommit` (1143/0), `just gen-api`, client + coach builds.
