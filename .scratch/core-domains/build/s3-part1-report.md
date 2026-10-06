# Slice 3 — Part 1 coverage

Part 1 passed before Tracker implementation. The backend suite increased from **672 to 715 tests**: **43 tests added, zero failures**. No tests were removed. No production defect was found by these tests, and no production code was changed for Part 1.

## Added files and coverage

| File | Tests | Coverage |
| --- | ---: | --- |
| `backend/test/easy_web/controllers/core_domain_contract_test.exs` | 16 | Training and nutrition plan reads, lists, writes and assignment across foreign-business and unassigned-coach boundaries; client plan isolation; missing resources; validation envelopes; stale revisions; template cursor pagination; session/set isolation; session pagination; meal isolation and validation; today's coaching term and path-date coverage. |
| `backend/test/easy_web/controllers/core_library_contract_test.exs` | 21 | Exercise, food and recipe create/update/archive, coach/client search and pagination, foreign reads and writes, missing resources, trusted-id rejection, stale nutrition-library updates, built-in protection, food category filters, combined muscle/equipment filters, food usage cursor pages, and recipe template/client-plan usage reads and filters. |
| `backend/test/easy_web/controllers/record_corrections_contract_test.exs` | 3 | Completed-session set correction and tombstone, visible history, exact journal old/new values and client actor; session/set request retries; meal correction/removal and request retries with exact journal values and sequence assertions. |
| `backend/test/easy/core_domain_concurrency_test.exs` | 3 | Separate database connections start together: workout and meal writes receive distinct client sequence numbers and both journal; training and nutrition publication races each produce one winner and one stale-revision conflict, with exactly two stored revisions. |

These four files are new. The existing slice-1 and slice-2 changes remain in the working tree. The only other file added for this task is this report.

## Current API limits

- The exercise library has no usage endpoint. Its existing exercise-history route serves performed-set history. No new usage feature was added in this test-restoration step.
- Recipes have no built-in/system source in the current model. Built-in read-only checks therefore cover foods and exercises.
- Client exercise lists support offset pagination. Coach exercise lists, food/recipe lists, plan templates and session histories support cursors. Tests use each route's current contract.
- Recipe lists have search but no category filter implementation. Tests cover recipe search; food category filters and exercise muscle/equipment filters have explicit tests.
- Meal removal means removing an entry from a meal, which creates an entry tombstone. The current API has no meal-header deletion operation. Tests assert both the entry's removed journal row and the meal header's changed row.

## Verification

- Baseline, verified by the root agent before Part 1: `rtk mix precommit` — **672 tests, zero failures**.
- Focused run of the first 42 additions: passed. The positive recipe usage test was then added and passed in the full suite.
- Final `rtk mix precommit` in `backend/`: **exit 0**, **715 tests, zero failures**, seed **32702**. Compile, formatter and Credo passed. The typed-route generation check passed for **126 routes**.
- No branch, worktree, commit or push was created. No API or frontend change was needed for Part 1.
