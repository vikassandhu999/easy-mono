# Show a logged planned meal without duplicate chips

Type: AFK
Status: resolved

## Parent

[Meal logging diary](../spec.md)

## Design constraints

Read the spec Design brief before coding. This ticket slices that brief; it does not replace it.

Must discard: `planned_item_index`; coach joining freeze items by position; two status implementations on the coach side.

Must delete or replace: positional `entryStatus` / `skippedPlannedItems` / `plannedMealItems` and their checks; snapshot items without ids; meal-log JSON that expects the UI to reconcile.

Do not patch `planned_item_index` back. `source` may still exist on rows until [Diary fulfilments survive builder deletes](./03-diary-fulfilments-survive-builder-deletes.md); status must not use it.

## What to build

When a client logs a meal as planned, the coach nutrition day and 14-day tab must show each food once, as planned, with no Added or Skipped chip. The meal log freezes planned item ids on first write. The server derives status from that freeze plus entries and returns it on the meal-log read. The coach renders that status and stops joining by planned item index.

Until the first fulfilment, a meal log for the same option may refresh its freeze from the live meal. After any fulfilment, the freeze is stable. `source` may still exist on rows; status must not use it.

## Acceptance criteria

- [x] Logging the planned meal, then reading the diary, yields every frozen item `as_planned`, zero `added`, zero `skipped`.
- [x] Logging one planned item leaves the rest `skipped` and that item `as_planned`.
- [x] Replacing a planned item yields `swapped` on that row and leaves the others unchanged.
- [x] Adding an extra yields one `added` row and does not mark planned items as added.
- [x] A slot with no meal log has no skipped rows and the coach still says nothing was logged.
- [x] Changing portion on a matching food stays `as_planned`.
- [x] Log-meal twice inserts nothing the second time. Log one item then log-meal inserts only the rest. Two planned items that share a food both log once.
- [x] Coach day view and 14-day counts use server status. Positional planned-index helpers and their checks are gone.
- [x] After a fulfilment exists, editing the live meal does not change that day's freeze or statuses.

## Blocked by

None - can start immediately

## Answer

Server owns diary reconciliation. Snapshot items freeze `id` / `food_id` / `recipe_id`. `MealLogs.diary_rows/1` derives `as_planned` / `swapped` / `skipped` / `added` from freeze plus entries (not `source`). Meal-log JSON emits `rows`. Same-option freeze refreshes until the first fulfilment; after that the freeze is stable and `log_meal` only fulfils freeze ids. Coach day view and 14-day tab render/count `rows`; `entryStatus` / `skippedPlannedItems` / `plannedMealItems` are deleted.

Verified: `mix precommit` (1144 tests, 0 failures); `pnpm -C apps/coachapp-v2 build`; OpenAPI regenerated via `just gen-api`.
