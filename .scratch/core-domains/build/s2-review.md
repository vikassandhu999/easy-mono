# Slice 2 independent correctness review

Reviewed the shared working tree on 6 October 2026. No implementation files were changed. The review read the frozen decisions, model, slice requirements, backend contract, record journal, shared plans, Nutrition library/content/record code, migrations, typed contract, client draft and recovery code, and Nutrition tests. The Elixir production-quality skill informed the error-path review. The parent agent owns full checks and browser tests.

All findings below come from source inspection. They were not reproduced against a live database. File lines refer to the reviewed version; other agents were editing these files during the review.

## Findings

### 1. Conflict recovery cannot keep a draft after another device creates the meal

Priority: P2. `frontend/apps/clientapp/src/nutrition/meal.tsx:566` and `frontend/apps/clientapp/src/api/nutrition.ts:102`.

Open the same empty planned slot on two devices. Each draft gets a separate meal ID. Device A saves first. Device B sees the conflict and selects "Review my draft instead". Recovery changes the draft revision to A's saved revision but keeps B's meal ID. `useSaveMeal` looks up the saved meal by B's ID, finds no row, compares revision 0 with revision 1, and raises another conflict before PATCH. Repeating recovery cannot succeed. The backend also rejects a missing row with expected revision 1.

Recovery must adopt the saved meal identity and its fixed prescription, with an explicit rule for a draft based on a different prescription. Add a test for two initial drafts of one slot; tests for edits to an existing meal do not cover this case.

### 2. A recorded slot combines two different revision contents

Priority: P2. `backend/lib/easy/nutrition_day_reader.ex:100`, function `slot/3`.

Record a slot under revision 1 with options A and B. Publish revision 2 for today, retaining the slot ID but replacing its options with C. The function selects revision 1 because the meal points to it, then filters revision 1's meals using revision 2's `meal_ids`. Its response has no options. The saved prescription's options disappear from the client alternative selector. Existing entries can still be saved, but the client cannot select an original alternative.

Resolve the slot and its options from the same saved revision. The current regression test republishes unchanged topology, so it does not detect this case. The parent reported that a backend fix was in progress.

### 3. A zero-yield recipe causes an exception when used

Priority: P2. `backend/lib/easy/nutrition/recipe.ex:55`, `backend/lib/easy/nutrition_library.ex`, functions `hydrate_recipe/2` and recipe `resolve/3`.

Create a recipe with an empty ingredient list and no cooked weight. The changeset accepts it, and hydration returns grams 0. Using it in a plan or diary calls `scale_components(recipe.food_components, grams / recipe.grams)`. This divides by zero. A positive grams portion and the default serving both reach this operation. The request raises an exception instead of returning a validation error.

Reject zero yield at the point where the recipe is resolved, or require positive yield when the recipe is saved. Keep the policy for incomplete library recipes explicit.

### 4. Duplicate custom slot names produce a meal that the client cannot save

Priority: P2. `backend/lib/easy/nutrition_content_validator.ex`, function `topology/1`; `backend/priv/repo/migrations/20261006000000_core_nutrition.exs`, `diary_meals` name constraint; `frontend/apps/clientapp/src/nutrition/meal.tsx`, conditional meal-name field.

Publish a day pattern with two different slot IDs named "Snack". Validation accepts the names. The client draft uses the slot name as the meal name. Saving the first works; saving the second violates `UNIQUE(client_id, local_date, name)`. The client cannot correct its name because the meal-name input is shown only when `draft.slotId` is empty.

Validate distinct slot names within each pattern, or let the client select a unique meal name. The latter also handles a free meal that already uses a planned slot's name.

## Reviewed behavior without a new finding

- The journal runs operations under the client lock, uses client or coach identity from Ctx, and increments the sequence only when changes exist.
- Published item values are copied, and planned portion scaling uses those copied values. Recipe food components preserve ingredient contributions for later metrics.
- Unknown nutrient values remain absent. Totals return null with known and total entry counts when any value is unknown.
- Day targets use the latest effective revision. Same-day immediate target changes are detected; the reviewed tests also cover a scheduled next-day target.
- `expected_meals` calls the shared `plan_covers` function and selects the revision in force for each date.
- Meal replacement, removed-entry journal rows, retry replay, no-op writes, quick add, tenant isolation, and recipe metrics have focused backend tests.

These observations do not certify all concurrent, timezone, or browser behavior. Full tests were not repeated during this review.

## Fix verification, 6 October 2026

This pass was limited to the four findings above.

1. **Addressed.** `frontend/apps/clientapp/src/api/nutrition-meals.ts:3` finds the saved meal by ID and then slot. `nutrition.ts` checks both identity and revision before saving and during retry recovery. `frontend/apps/clientapp/src/nutrition/meal-draft.ts:89` now adopts the saved ID, revision, slot and prescription, creates new request IDs, and retains local food amounts and notes. When the prescription differs, retained foods lose their old planned-item links. `meal.tsx:578` calls this helper. The regression test covers first saves from different devices, next-save identity/revision, retained edits, and different prescriptions. Command `rtk node --experimental-strip-types frontend/apps/clientapp/tests/nutrition/conflict.test.ts` exited 0 in this review.

2. **Addressed in source and regression coverage.** `backend/lib/easy/nutrition_day_reader.ex:106` now finds the slot in the recorded meal's revision before selecting its options. `backend/test/easy/nutrition/core_nutrition_test.exs:357` changes the current option ID before publication and asserts that the recorded slot still returns the original prescription and copied nutrients. The backend test was inspected, not rerun in this review.

3. **Addressed in source and regression coverage.** `backend/lib/easy/nutrition_library.ex:213` checks `recipe.grams > 0` before calculating serving weight or component ratios. It returns `{:error, :invalid_portion}` for zero yield. The guard covers both grams and serving input. `backend/test/easy/nutrition/core_nutrition_test.exs:381` covers an empty recipe with no cooked weight and a serving request. The backend test was inspected, not rerun in this review.

4. **Partially addressed.** `backend/lib/easy/nutrition_content_validator.ex:64` now requires unique slot names per pattern; the regression at `backend/test/easy/nutrition/core_nutrition_test.exs:392` covers two exact names. However, `unique_slot_names?/1` at line 79 compares raw strings. The client trims meal names in `mealInput`, so slots named `Snack` and ` Snack ` still pass publication and become the same diary name. The planned meal-name field remains hidden. Normalize names consistently before checking uniqueness. The earlier report also identified collision with an existing free meal; the duplicate-slot validation alone does not cover that case.

## Final R4 verification, 6 October 2026

**R4 is addressed.** This pass checked only the remaining name-collision paths.

- `backend/lib/easy/nutrition_content_validator.ex` now trims slot names before checking uniqueness and before returning the document for storage. The test `slot names are trimmed before uniqueness checks and publication` in `backend/test/easy/nutrition/core_nutrition_test.exs:423` rejects `Snack` together with ` Snack `, confirms that ` Breakfast ` is stored as `Breakfast`, and rejects a non-string slot name. Source and test were inspected; the backend suite was not rerun here.
- `frontend/apps/clientapp/src/nutrition/meal.tsx:298` now shows the meal-name input for planned meals too. It explains that changing the record name does not change the plan slot.
- `frontend/apps/clientapp/src/api/nutrition-meals.ts` detects a duplicate name on a different slot with `MealNameConflict`. `nutrition.ts` checks this after its fresh read and during retry recovery. A free meal is not selected as the saved record of a planned slot. The editor clears only the pending attempt when this error occurs, so the client can rename the meal while retaining the draft intake.
- `rtk node --experimental-strip-types frontend/apps/clientapp/tests/nutrition/conflict.test.ts` exited 0. Its added assertions cover the planned/free-meal name collision, successful validation after renaming, retained prescription identity, and unchanged draft entries.

All four original findings are now addressed in the inspected implementation. Browser and full-suite verification remain the parent agent's responsibility.
