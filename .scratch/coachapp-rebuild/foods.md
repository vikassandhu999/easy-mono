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

Category filtering completes the library browsing task: when a coach knows the kind of food but not its name, they can narrow the list before searching. Use one optional Category select beside Search foods on desktop and below it on mobile. A separate filter drawer adds an extra step for one choice, so keep the control visible. All categories is the default. The existing categories endpoint supplies choices; the cursor endpoint supplies matching rows and totals. Preserve category and search in the URL and through create/edit return navigation. Failed category reads must leave name search and clearing the selection available, with an explicit retry. A removed or unknown selected category stays visible until the coach clears it. Verify three filtered pages, combined search, retry, empty results, long names and mutation invalidation at both widths.

Food queries and writes belong in api/foods.ts, with food-specific query keys. The meal picker consumes that same resource hook. Food edits invalidate nutrition data because meal and recipe nutrients resolve from the shared library. Lists and aggregates remain server-owned. No legacy UI or handwritten code is used. Category filtering uses the existing API contract.

## Verification results

On 2026-09-11, the food browser suite passed at 375px and 1280px. It covers successful creation, an interrupted create recovered without a duplicate, blank versus zero values, tag selection by pointer and keyboard, preserved serving sizes, failed writes, stale revisions, initial-read retry, a read-only shared-food fixture, cursor pages and retries, search beyond the first page, return position, and account switching during a pending write. A food created through this screen is selected in a real meal plan and resolves to the expected nutrient value through the server preview.

Both nutrition browser suites passed after moving the meal picker to the food resource hook. The app build, Biome, the former repository checks and backend precommit passed; precommit ran 1,645 tests with zero failures. Vite retains its bundle-size warning. No backend contract or legacy UI changed.

Screenshots were inspected at both widths. Browser verification does not replace a target-coach usability session or physical-device keyboard testing. Graph lookup timed out; bounded source reads and reference searches were used.


## Authoring recovery audit, 2026-09-16

Food creation keeps the uncertain draft fixed until saved-result review. Returning to the draft preserves that state; choosing a separate item restores editing and name focus without a request. The unsaved-changes confirmation still supports leaving. Save confirmations receive focus.

The full authoring suite passes at 375px/1280px, including empty lookup, explicit retry, real saved-record recovery with one POST, revision conflicts, server values, meal reuse and account isolation. Food media upload/playback regression also passes at both widths. Build, Biome, repository checks and backend precommit pass (1,778 tests). Screenshots are archived under `/tmp/coachapp-food-recipe-audit-2026-09-16`.


## Category browsing audit, 2026-09-16

The library now has a server-backed Category select. Search and category survive reload and editor return; newly saved categories refresh automatically. Unknown selections remain visible and clearable. Failed category reads leave search usable, and a successful explicit retry returns keyboard focus to the selector after loading.

`test:food-categories` passes at 375px/1280px against the normal API and app: three filtered pages, retained page failure/retry, remote-name search, combined filters, zero results, return/reload, creation invalidation, the literal category `all`, long labels and unknown selections. The full food authoring, recipe authoring and nutrition-plan journeys also pass at both widths. Screenshots were inspected and archived under `/tmp/coachapp-food-category-audit-2026-09-16`. Temporary foods are deleted after successful category scenarios; disposable accounts remain.

Copied food names exposed a server search mismatch: stripping punctuation before full-text parsing changed hyphens and decimal tokens. Search now uses the stored vector's PostgreSQL parser and dictionary, with prefix matching and newest-first fallback for punctuation-only input. Controller regression cases cover hyphens, decimals, apostrophes, Unicode, prefixes and category scope. The existing API shapes and generated types remain valid; the API contract reviewer confirmed the new hooks against the contract.

Checkpoint gates pass: app production build, scoped Biome, repository checks and full backend precommit (1,779 tests, zero failures; `/tmp/coachapp-food-category-precommit-verified.log`). The existing bundle-size warning remains. Normal API4000, coach2022 and client1314 return HTTP200.
