# Food library

When a food is missing from the library, the coach needs to record its nutrition once and reuse it in meal plans. This task usually starts from nutrition planning and may be done on a phone while reading a package label.

## Screen brief and plan

1. Add a Food library entry from Nutrition plans. Use the established cursor list with server search and totals, preserving search and position when returning from a food.
2. Create food opens one form: name, nutrition per 100 g, then optional brand/category, allergens, dietary tags and notes. Blanks mean unknown; zero is an explicit value. No nutrient calculation happens in the browser. Existing serving sizes and media are preserved when editing.
3. Open a saved food to review or edit custom food data. System foods are read-only. Explain that changing a library food updates nutrition wherever it is referenced. Use the API revision to reject stale writes. Recipe creation, media and serving-size editing, deletion and copying system foods are separate tasks.
4. Save once, then return to the saved food. It becomes available in the meal picker. Unknown creation outcomes offer checking matching saved foods before a separate create; edits offer loading the latest saved revision. Navigation warns about unsaved changes, pending writes disable controls, and session changes cannot restore stale data.
5. Verify at 375px and 1280px: pages/search/retry/return, empty results, creation, nullable values, editing, conflicts, unknown outcomes, session isolation and selecting the saved food in a real meal plan.

A step-by-step label wizard and a single grouped form were considered. Use the single form so a coach can copy label values without page changes. The per-100-g basis stays beside the fields to prevent entering serving values as per-100-g values. Optional details stay collapsed until needed. The library list emphasizes the food name, then brand and the explicitly labelled calorie basis.

## Implementation boundaries

Food queries and writes belong in api/foods.ts, with food-specific query keys. The meal picker consumes that same resource hook. Food edits invalidate nutrition data because meal and recipe nutrients resolve from the shared library. Lists and aggregates remain server-owned. No legacy UI or handwritten code is used. No API changes are expected.

## Verification results

On 2026-09-11, the food browser suite passed at 375px and 1280px. It covers successful creation, an interrupted create recovered without a duplicate, blank versus zero values, tag selection by pointer and keyboard, preserved serving sizes, failed writes, stale revisions, initial-read retry, a read-only shared-food fixture, cursor pages and retries, search beyond the first page, return position, and account switching during a pending write. A food created through this screen is selected in a real meal plan and resolves to the expected nutrient value through the server preview.

Both nutrition browser suites passed after moving the meal picker to the food resource hook. The app build, Biome, check-rm and backend precommit passed; precommit ran 1,645 tests with zero failures. Vite retains its bundle-size warning. No backend contract or legacy UI changed.

Screenshots were inspected at both widths. Browser verification does not replace a target-coach usability session or physical-device keyboard testing. Graph lookup timed out; bounded source reads and reference searches were used.
