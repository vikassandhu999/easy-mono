# Meal logging diary rewrite

Label: wayfinder:map
Status: active

## Destination

Ship the meal-log diary rewrite in [Meal logging diary](./spec.md): one freeze per slot, server-owned status, both apps rendering that payload. The effort ends when the five implementation tickets are done and a planned dinner no longer shows as Added plus Skipped.

## Notes

* The source specification is [Meal logging diary](./spec.md). Read the Design brief before any ticket: fundamental job, ground truths, inherited assumptions to discard, target design, and code to delete. Tickets slice that brief; they do not replace it. The planning conversation is not available to later sessions.
* This map carries execution. Product decisions are closed in the Design brief. Do not reopen them unless a ticket proves the brief is wrong.
* An implementation that keeps a discarded assumption (positional join, `source` as identity, kitchen-sink request body, opaque today map, nullifying FK) has not finished the ticket.
* Prefer `first-principles-edit` over bolting status onto the old join. Use `elixir-conventions` for backend writes and `codebase-memory-axi` for structural discovery.
* Refer to map tickets by title in human-facing notes.

## Decisions so far

* [Meal logging diary](./spec.md) Design brief — One diary, one server status function, typed write verbs, nutrition-day payload; discarded joins, `planned_item_index`, `source`, kitchen-sink request, opaque today map, and nullifying FK.
* [Show a logged planned meal without duplicate chips](./issues/01-show-logged-planned-meal-without-duplicate-chips.md) — Freeze carries item ids; meal-log `rows` carry server status; coach renders those rows; positional join helpers deleted.
* [Client Today follows the diary freeze](./issues/02-client-today-follows-the-diary-freeze.md) — Client Today renders diary `rows` for logged slots and live checklists for unlogged ones; `buildSlots` join deleted.
* [Diary fulfilments survive builder deletes](./issues/03-diary-fulfilments-survive-builder-deletes.md) — `planned_item_id` uuid (no nullifying FK); `source` removed; switch drops fulfilments by planned id.
* [Typed diary write verbs](./issues/04-typed-diary-write-verbs.md) — Per-verb request schemas and routes; kitchen-sink create gone; replace is atomic one-entry swap; client Today uses planned_item_id + portion verbs.
* [One nutrition-day read](./issues/05-one-nutrition-day-read.md) — Documented `NutritionDay` payload for client and coach; opaque today map and `asTodayPlan` deleted; history and 14-day tab use the range form.

## Not yet specified

* None. Implementation is fully specified as child tickets.

## Out of scope

* Food and recipe library, nutrition plan builder, and plan assign.
* Training planned snapshots and performed sets.
* Coach-authored diary writes.
* Business-local dates.
* Pixel-perfect redesign of Today or coach nutrition.
* Perfect skip matching for historical snapshots with no recoverable item id.
