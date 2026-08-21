# 16 — Complete the contract cutover and remove legacy Nutrition

**What to build:** Finish the destructive rewrite by deleting every replaced Nutrition path and proving that the backend, generated contracts, both applications, seeds, and tests use only Library, Programming, and Diary.

**Blocked by:** 15 — Serve durable history and coach summaries

**Status:** resolved

- [x] Legacy Programming and Diary schemas, data tables, contexts, child mutation routes, raw meal-log routes, response branches, and tests are removed.
- [x] The final route surface retains recognizable Food, Recipe, and plan families while Menu writes and Diary commands use aggregate-oriented contracts.
- [x] No dual writes, compatibility contexts, feature flags, or parallel read models remain.
- [x] OpenAPI contains the final plan-kind, Portion, nutrient-completeness, Meal Slot, Nutrition Day, status, revision, and idempotency contracts.
- [x] Generated coach and client types contain no replaced child-resource or raw-log shapes.
- [x] Coach and client callers contain no legacy route calls, handwritten replacement types, status reconciliation, nutrient reconciliation, or stale query keys.
- [x] Representative factories and development seeds rebuild Foods, Recipes, Templates, Client Plans, Menus, frozen options, planned fulfilments, extras, and no-Coverage entries without discarded IDs.
- [x] Reset verification proves that retained Library, Business, Client, and media data survive while legacy Programming and Diary data do not.
- [x] Route-coverage, schema/view parity, database-constraint, domain, controller, concurrency, reset, and end-to-end tests pass.
- [x] The coach app builds and its touched flows are verified at phone and desktop widths.
- [x] The client app builds and its Today and History flows are verified at phone width.
- [x] Backend precommit, frontend checks, generated OpenAPI checks, recurring-mistake checks, and searches for every replaced symbol and route pass on the integrated rewrite.

## Answer

Leftover MealLogs, 6-slot MealSlot, PlanDay, DayMeal, child Menu routes, and raw meal-log HTTP are gone. OpenAPI and both generated `schema.ts` files keep Food, Recipe, plan, Menu, and Diary Nutrition Day contracts (plan kind, Portion, completeness, 11 Meal Slots, revision, `Idempotency-Key`). WeightEntry schemas moved out of the deleted logging file. Coach overview/stat-strip read `NutritionDay.summary`; client Today/History already used Nutrition Days. Factories, `cutover_test`, and dev seeds rebuild Library/Programming/Diary without discarded IDs; Diary writes stamp `last_active_at`. Coach and client apps build. Client Today and History passed a live 375 px walkthrough. Coach overview passed live 375 x 812 and 1280 x 900 walkthroughs without horizontal overflow or console errors.
