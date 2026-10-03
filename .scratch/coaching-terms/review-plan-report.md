# Plan coverage review fixes

`Easy.PlanCoverage` now uses the plan's client-local `inserted_at` date to find the first coaching term end on or after creation. Its lifecycle, stopped date, effective end, and SQL `in_force` query follow E6. Rescheduling a stopped plan cannot revive it, so the start-date mutation guard is deleted.

`Easy.PlanOverlap.validate/2` receives `Ctx` and runs inside the existing plan-write transaction. It locks the tenant-scoped client row, loads unarchived plans for the same service, and compares their effective date ranges. Only terms that ended before the client's current date trim those ranges. A stop before a future plan start produces an empty range. New assignments stamp `inserted_at` before validation and persist that same timestamp.

Training and nutrition assignment, update, and restoration call the shared check. Errors retain the messages consumed by the frontend. Incomplete-plan uniqueness remains a separate database constraint.

The trigger migration `20261003000000_term_plan_coverage.exs` is deleted. The training and nutrition baseline migrations no longer create plan overlap exclusions. Coaching term overlap and date-order constraints remain unchanged. Raw schema inserts no longer promise plan overlap protection.

Verification:

- `rtk mix compile --warnings-as-errors` passed.
- Nine focused files passed with 90 tests, including SQL and Elixir parity, creation timezone boundaries, stopped future plans, overlap edits and restoration, and public concurrent assignments from distinct templates for both services.
- Two additional public invitation-acceptance regressions passed. `rtk mix test test/easy/plan_return_test.exs` passed all 10 tests.
- Strict Credo passed for the affected implementation and new tests. `rtk git diff --check` passed.
- The parent reset the development and test databases with the revised baselines before overlap tests ran.
- The parent's combined `rtk mix precommit` passed: 1,242 tests, zero failures, typed-route checks, and strict Credo. The output was reviewed in `/tmp/coaching-review-precommit.log`. The parent owns the final repeat after subsequent acceptance-wrapper cleanup and API generation.

Graph tools were unavailable in this session. Verification used direct source reads and targeted searches.
