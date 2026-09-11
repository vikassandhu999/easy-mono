# Recipe library and editor

When preparing a client's meals, a coach needs to combine library foods into a reusable recipe so that the same preparation can be selected in future plans. This is an occasional desktop or mobile task. The costly mistakes are entering quantities for one serving while describing a whole batch, losing draft ingredients, and accidentally creating duplicates after an interrupted save.

Choose a single worksheet over a step-by-step wizard. The coach can check servings against ingredient quantities without going back through steps. Start with name and servings, place editable quantities beside clear ingredient names, and keep preparation notes optional. Use whitespace and typography to group ingredients. Add several ingredients in one searchable picker. Support removal with undo.

Enter from Nutrition → Recipe library. Search uses the existing cursor list and server count. Create or reopen a recipe; saving returns the server's revision and nutrition for the whole recipe. Hide saved totals while edits are unsaved. The backend owns nutrient calculations and ingredient portion resolution. Preserve existing recipe tags when editing; this slice does not infer allergen or dietary claims.

Use the existing recipe endpoints; no public API change. Recipe queries own their cache keys, and food/recipe writes invalidate dependent nutrition views. Keep drafts on request failures, check saved recipes after uncertain creation, explicitly replace drafts after revision conflicts, and protect unsaved navigation and account changes.

Graph discovery was attempted through the available CLI but timed out. Bounded source reads covered the new app, generated schema, recipe controller/writer, portion resolver and nutrient formatter. No old app implementation was consulted.

Verified on 2026-09-11 at 375px and 1280px in `tests/recipes/recipes.browser.mjs`: batch ingredient selection across searches, quantity validation, serving-to-gram changes, removal/undo, notes, saved totals with unknown values, preservation of existing tags, unsaved navigation, committed creation with a lost response, revision conflicts, failed reads/writes and retries, 44 recipes across cursor pages, search beyond page one, URL reload, return scroll restoration, food-edit invalidation, meal-plan reuse and account replacement during a pending save. Screenshots were reviewed at both widths. Optional finished weight sits below the ingredient worksheet, and Remove sits beside the ingredient name on mobile.

The existing nutrition creation/assignment and recovery browser suites passed at both widths. App build, Biome, repository shape checks and backend `mix precommit` passed (1,645 tests, zero failures). Vite still reports the existing large-bundle warning. No target-coach usability review has been performed.
