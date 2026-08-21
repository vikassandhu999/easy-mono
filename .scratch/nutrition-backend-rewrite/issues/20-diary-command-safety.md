# Diary command safety

Type: task
Status: resolved

## Question

Do Diary commands reject unscheduled slots, preserve tenant boundaries, clean expired retry state, and return stable errors under negative paths?

## Scope

- Reject planned logging for a Meal Slot not scheduled in live guidance.
- Add production cleanup for expired command-ledger rows.
- Add negative-path and cross-tenant tests for planned commands, switching, entry update, and entry delete.
- Pin coach denial to its intended response.
- Refresh Nutrition Days after stale switch failures.

## Finish

- Focused Diary context and controller tests pass.
- Client checks covering command ownership and stale refresh behavior pass.

## Answer

Planned logging now rejects unscheduled Meal Slots. A supervised daily sweeper purges expired command-ledger rows. Context and controller tests cover tenant denial, negative planned commands, and the exact coach denial response. Stale switch failures invalidate Nutrition Day lists. The focused combined backend run passed 135 tests.
