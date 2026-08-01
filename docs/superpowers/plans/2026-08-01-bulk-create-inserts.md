# Bulk Create Inserts

**Goal:** Keep current meal-item and workout-element validation while replacing one INSERT per row with one INSERT per batch.

## Plan

1. Add query regressions proving a multi-row request emits one INSERT for each target table.
2. Build every row through the existing changeset and reference checks before writing anything.
3. Generate UUIDs and timestamps, call `Repo.insert_all/3` once, and return results in request order.
4. Run focused tests, formatter/Credo, the full backend precommit gate, and commit this concern alone.

## Deliberate limits

- No new bulk-write abstraction: only these two confirmed per-row paths are in scope.
- No change to append-position concurrency or API contracts.
