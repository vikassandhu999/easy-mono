# Meal-log date bound plan

**Goal:** Prevent meal-log list endpoints from preloading unbounded history.

**Design:** Validate date selection once in `Easy.MealLogs`, shared by coach and client endpoints. Exact dates win; no dates default to today; a range requires both bounds, must be ordered, and may cover at most 31 inclusive days. Current frontend ranges are 7 and 14 days.

## Tasks

1. Add controller regressions for 31-day boundary, over-bound, reversed, missing-bound, and no-date behavior.
2. Make date filtering return either a bounded query or a domain validation error.
3. Map those errors to clear 422 field responses and document the contract in both OpenAPI operations.
4. Regenerate frontend schemas; run focused tests, backend precommit, affected frontend typechecks, `just check-rm`, and `git diff --check`; commit this concern alone.
