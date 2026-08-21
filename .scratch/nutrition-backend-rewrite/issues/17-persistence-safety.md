# Persistence safety

Type: task
Status: resolved

## Question

Can the Nutrition rewrite migrations preserve data, roll back cleanly, and support every cascade and tenant-scoped Diary lookup without table scans or cross-client rows?

## Scope

- Replace the destructive Recipe Ingredient cleanup with a migration failure that names the bad rows.
- Repair the Recipe and Programming rollback paths.
- Add the missing Day Pattern, Meal Option, and tenant-leading Diary indexes.
- Bind Diary Entry client identity and frozen-option identity to its Diary Slot in Postgres.

## Finish

- Focused migration/schema tests pass.
- `cd backend && mix precommit` passes before the full effort is handed off.

## Answer

Replaced the Recipe Ingredient deletion with an actionable migration failure, repaired both historical rollback paths, and added a forward migration for cascade and tenant-leading indexes. Diary Entries now have database-enforced client/slot and frozen-option/slot identity.

Focused check: `mix test test/easy/nutrition/canonical_schema_test.exs` (30 tests, 0 failures).
