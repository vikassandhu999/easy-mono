# 16 — Complete the contract cutover and remove legacy Nutrition

**What to build:** Finish the destructive rewrite by deleting every replaced Nutrition path and proving that the backend, generated contracts, both applications, seeds, and tests use only Library, Programming, and Diary.

**Blocked by:** 15 — Serve durable history and coach summaries

**Status:** ready-for-agent

- [ ] Legacy Programming and Diary schemas, data tables, contexts, child mutation routes, raw meal-log routes, response branches, and tests are removed.
- [ ] The final route surface retains recognizable Food, Recipe, and plan families while Menu writes and Diary commands use aggregate-oriented contracts.
- [ ] No dual writes, compatibility contexts, feature flags, or parallel read models remain.
- [ ] OpenAPI contains the final plan-kind, Portion, nutrient-completeness, Meal Slot, Nutrition Day, status, revision, and idempotency contracts.
- [ ] Generated coach and client types contain no replaced child-resource or raw-log shapes.
- [ ] Coach and client callers contain no legacy route calls, handwritten replacement types, status reconciliation, nutrient reconciliation, or stale query keys.
- [ ] Representative factories and development seeds rebuild Foods, Recipes, Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without discarded IDs.
- [ ] Reset verification proves that retained Library, Business, Client, and media data survive while legacy Programming and Diary data do not.
- [ ] Route-coverage, schema/view parity, database-constraint, domain, controller, concurrency, reset, and end-to-end tests pass.
- [ ] The coach app builds and its touched flows are verified at phone and desktop widths.
- [ ] The client app builds and its Today and History flows are verified at phone width.
- [ ] Backend precommit, frontend checks, generated OpenAPI checks, recurring-mistake checks, and searches for every replaced symbol and route pass on the integrated rewrite.
