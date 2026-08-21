# 03 — Rewrite the Recipe Library contract

**What to build:** Move retained Recipe behavior behind Nutrition Library and make Recipe composition and Portions consistent across backend, contract, and both applications. A Recipe is an ordered composition of Foods and always supports serving-based use.

**Blocked by:** 02 — Rewrite the Food Library contract

**Status:** resolved

- [x] Existing Recipes and Recipe Ingredients survive the rewrite with trusted tenant ownership.
- [x] Every Recipe has a positive servings count; cooked weight is optional and positive when present.
- [x] Recipe Ingredients reference visible Foods only, use positive gram weights, and have deterministic unique positions.
- [x] Recipe creation and update replace metadata and the complete ingredient collection atomically with expected revision checking.
- [x] Recipe subrecipes are rejected at the contract and domain boundaries.
- [x] Every Recipe accepts positive serving Portions, while gram Portions are accepted only when cooked weight exists.
- [x] Recipe nutrient calculation uses the Food Library rules for nullable nutrients, completeness, full calculation precision, and response rounding.
- [x] Recipe listing, search, detail, create, edit, duplication, impact, and deletion work through the generated contract in the coach app.
- [x] Client Recipe browsing uses the same visible Library and Portion vocabulary.
- [x] Library exposes one batch item-and-Portion resolver that returns Food and Recipe results in input identity order for later Programming and Diary callers.
- [x] Library, database, controller, contract, and frontend tests cover tenant isolation, atomic replacement, portions, revisions, duplication, and incomplete nutrients.

## Answer

Recipe CRUD now lives in `Easy.Nutrition.Library` next to Foods. `Easy.Recipes` is gone. Writes lock the row, take the observed revision, and return 409 with `current_revision` when it is stale. Create and update replace the ingredient list in one transaction: delete-all plus insert, positions stamped `0..n-1` from list order. Ingredients must be visible Foods with `weight_g > 0`; a `recipe_id` on an ingredient is rejected at OpenAPI and in the changeset. Servings are required and positive; cooked weight is optional and positive when present. Serving Portions are always valid; gram Portions need cooked weight. `Library.resolve_items/2` returns mixed Food and Recipe results in input order. JSON Recipes expose `revision` and `nutrients` (`NutrientTotals`), not `nutrition` or `foods`. Coach Duplicate posts the copy endpoint; clients read the same Recipe payload. Usage-impact display stays on ticket 09; the impact endpoint is in the generated contract.
