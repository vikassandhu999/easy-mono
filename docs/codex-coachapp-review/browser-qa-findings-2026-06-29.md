# Coachapp Browser QA Findings - 2026-06-29

Target: `frontend/apps/coachapp-v2` at `http://localhost:2021`

Backend: `http://localhost:4000`

Scope: authenticated coach browser testing only. Auth routes were intentionally skipped after the initial correction.

## Open Findings

### 1. Foods: fresh food creation fails

Severity: High

Route: `/library/foods/create`

Reproduction:

1. Open `/library/foods/create`.
2. Fill:
   - Name: `QA Browser Food <timestamp>`
   - Category: `qa`
   - Source: `browser`
   - Notes: `Browser QA food note`
   - Calories: `123`
   - Protein: `11`
   - Carbs: `22`
   - Fat: `3`
3. Click `Create food`.
4. Add a serving size:
   - Unit: `g`
   - Amount: `100`
   - Weight, grams: `100`
5. Click `Create food` again.

Observed:

- Page stays on `/library/foods/create`.
- Error shown: `Food wasn't created. Check the details and try again`.
- No field-level error appears.
- Adding a serving size does not fix the submit failure.
- No relevant browser console error was shown for the failed submit.

Expected:

- Valid food data should create a food and navigate to the food detail/list.
- If backend rejects the payload, the UI should show the exact field/problem.

### 2. Foods: create form logs uncontrolled/controlled warnings

Severity: Medium

Route: `/library/foods/create`

Observed browser console warnings during food creation:

```text
WARN: A component changed from uncontrolled to controlled.
```

Expected:

- Food form fields should mount with stable controlled values.

### 3. Foods: list briefly shows empty state while loading

Severity: Low

Route: `/library/foods`

Observed:

- On one list load, the page showed:

```text
Loading more...
No foods yet
Create your first food to get started.
```

- Searching immediately afterward loaded existing foods correctly.

Expected:

- Empty state should not render while data is still loading.

### 4. Check-ins: assigned check-in has no visible unassign/remove action

Severity: Medium

Routes:

- `/library/check-ins`
- `/clients/6e7bf16c-58d8-4be8-99bf-a0104f4e0240`

Reproduction:

1. Open pending client detail.
2. Click `Assign check-in`.
3. Select `QA Weekly Check-in Browser Tight`.
4. Click `Assign to QA Client 1782710829868`.
5. Click the assigned check-in row.

Observed:

- Assignment succeeds and shows `Check-in assigned`.
- The client detail shows:

```text
QA Weekly Check-in Browser Tight
Assigned
No response yet.
```

- No visible `Remove`, `Unassign`, or `Delete` control exists for the assignment.

Expected:

- Coach should have a clear way to remove a mistakenly assigned check-in, or the product should explicitly document that assignments are permanent.

Side effect left:

- `QA Weekly Check-in Browser Tight` remains assigned to `QA Client 1782710829868`.

### 5. Recipes: list briefly shows empty state while loading

Severity: Low

Route: `/library/recipes`

Observed:

- On list load, the page showed:

```text
Loading more...
No recipes yet
Create your first recipe to get started.
```

- Existing recipes appeared afterward.

Expected:

- Empty state should not render while data is still loading.

### 6. Recipes: QA food ingredient is rejected as missing nutrition data

Severity: Medium

Route: `/library/recipes/create`

Reproduction:

1. Open `/library/recipes/create`.
2. Fill recipe name, instructions, and cooked weight.
3. Click `Add ingredient`.
4. Search `QA Lentils 1782710742584`.
5. Select the food.
6. Set amount/weight.
7. Click `Create recipe`.

Observed:

- Picker result shows the food has nutrition:

```text
QA Lentils 1782710742584
180 kcal
12g protein
```

- Create fails with:

```text
An ingredient is missing nutrition data — edit that food to add its macros.
```

Expected:

- If the food has macros in the picker/detail view, recipe creation should accept it.
- If some required nutrition field is actually missing, the UI should say which field is missing.

### 7. Recipes: ingredient picker stays open after selection

Severity: Low

Route: `/library/recipes/create`

Observed:

- Selecting a food adds it to the recipe form, but the `Add ingredient` picker dialog stays open.
- Clicking `Create recipe` while that dialog remains open does not complete creation.
- The dialog has two `Close` controls: one closes the dialog, one clears search. The visual flow is easy to misread.

Expected:

- After selecting a food, either close the picker automatically or make the next required action clear.

### 8. Recipes: duplicate creates an indistinguishable copy

Severity: Low

Route: recipe detail page

Observed:

- Clicking `Duplicate` directly created a second recipe and navigated to it.
- The duplicate had the same visible name as the original, without a `(copy)` suffix or clear success message.

Expected:

- Duplicated recipes should be visually distinguishable, or the UI should show a clear success state.

### 9. Nutrition plans: list briefly shows empty state while loading

Severity: Low

Route: `/library/nutrition-plans`

Observed:

- On list load, the page showed:

```text
Loading more...
No nutrition plans yet
Create your first nutrition plan to get started.
```

- Existing nutrition plans appeared shortly afterward.

Expected:

- Empty state should not render while data is still loading.

### 10. Nutrition plans: new detail route briefly renders only the header

Severity: Low

Route: `/library/nutrition-plans/:id`

Observed:

- After creating a nutrition plan, the route changed to the new plan detail.
- Initial page text was only:

```text
60
Nutrition Plan
```

- After waiting, the builder content loaded.

Expected:

- Show a proper loading state, or render the builder only when required data is ready.

### 11. Nutrition plans: schedule assignment does not persist after reload

Severity: High

Route: `/library/nutrition-plans/:id`

Reproduction:

1. Create a nutrition plan.
2. Add `Meal 1`.
3. Add `QA Lentils 1782710742584` at `100g`.
4. Assign `Meal 1` to `Breakfast`.
5. Confirm daily total updates to:

```text
180 / 2100 kcal
9%
```

6. Reload the page.

Observed:

- Meal and meal total persisted:

```text
Meal 1
180 kcal · 12P/28C/4F
```

- Breakfast assignment reset to `Unassigned`.
- Daily total reset to:

```text
0 / 2100 kcal
0%
```

Expected:

- Schedule slot assignment should persist across reload.

### 12. Nutrition plans: add-food flow has an unnecessary extra confirmation step

Severity: Low

Route: `/library/nutrition-plans/:id`

Observed:

- Selecting a food in `Add to Meal 1` does not add it directly.
- The button changes to `Add 1 item`.
- Clicking `Add 1 item` opens a second amount dialog.
- The amount dialog requires entering grams, then clicking `Add to meal`.

Expected:

- This may be intentional, but the flow should make the two-step add explicit. The current first confirmation looks like it should complete the add.

### 13. Nutrition builder: item dialog has no editable amount field, but keystrokes can edit plan macros

Severity: High

Route: `/library/nutrition-plans/:id`

Reproduction:

1. Open a nutrition plan builder.
2. Add a meal item such as `Banana rhizome` at `100g`.
3. Click the meal item row.
4. Try to edit the item amount from the `Item` dialog.

Observed:

- The dialog shows:

```text
Item
Done
resolves to 100g →
51 kcal
0.4P · 11.8C · 0.2F
Changes save automatically
Remove from meal
```

- No editable amount/grams field is exposed in the dialog.
- Typing `50` while the dialog was open changed the underlying plan `Fat (g)` input from `70` to `50`.
- The plan header updated to `Target 2450 · 160P 260C 50F`, and the `50F` value persisted after reload.

Expected:

- Meal item amount should be editable from the item dialog if the dialog says changes save automatically.
- Keystrokes in the dialog should not mutate underlying plan macro fields.

### 14. Nutrition builder: empty meal delete fails with a generic error

Severity: Medium

Route: `/library/nutrition-plans/:id`

Reproduction:

1. Open a nutrition plan with an empty meal.
2. Open that meal's `Meal options` menu.
3. Click `Delete meal`.

Observed:

- The menu exposes only `Rename` and `Delete meal`.
- Clicking `Delete meal` on an empty meal shows:

```text
Couldn't delete meal
```

- The meal remains in the builder.

Expected:

- Empty meal deletion should succeed, or the UI should explain why the meal cannot be deleted.

### 15. Nutrition builder: inline target edit can leave stale summary text

Severity: Low

Route: `/library/nutrition-plans/:id`

Observed:

- Editing Calories from `2400` to `2450` updated the input immediately.
- The target summary initially still showed `Target 2400`.
- The summary later updated to `Target 2450 · 160P 260C 70F` after additional builder actions.

Expected:

- The target summary should update consistently with the inline inputs, or show an explicit saving state until the saved values are reflected.

### 16. Nutrition builder: route can briefly leak stray log text above the page

Severity: Low

Route: `/library/nutrition-plans/:id`

Observed:

- Builder snapshots intermittently included stray `- log` entries before the main page content.
- During earlier plan creation, the detail route also briefly rendered only:

```text
60
Nutrition Plan
```

Expected:

- The builder should not expose transient log/debug text or partial numeric fragments in the rendered page.

## Fixed During This QA Run

### 17. Foods API: pagination crashed on duplicate sort keys

Severity: High

Observed earlier:

- Food list paging could fail with a duplicate key/keyset issue when records shared the same timestamp.

Fix applied:

- `backend/lib/easy/nutrition/food.ex` now orders foods by `inserted_at` and `id`.
- Regression test added in `backend/test/easy_web/controllers/coaches/food_controller_test.exs`.

Verification:

- Targeted backend food controller test passed.
- Full backend test suite passed after the fix.

### 18. Shared number field: uncontrolled/controlled warning

Severity: Medium

Observed earlier:

- Shared number field wrapper could mount uncontrolled and later become controlled.

Fix applied:

- `frontend/apps/coachapp-v2/src/@components/form-fields/form-number-field.tsx` now gives empty number fields a stable value.
- Added prevention note `RM-120` in `docs/agents/recurring-mistakes.md`.

Verification:

- Coach app TypeScript check passed.
- Coach app build passed.
- Biome check passed for the touched file.

## Passed Coverage

### Check-ins

- List load.
- Create template with question.
- Open created template edit screen.
- Edit name/question and save.
- Delete created template.
- Assign existing check-in to client.
- No relevant console errors during the tested check-in flows.

### Foods

- Search existing food.
- Open existing food detail.
- Edit existing food note and save.
- Restore edited note after test.
- Duplicate existing food.
- Delete duplicated food.

### Recipes

- List load.
- Create recipe with system food ingredient.
- Open created recipe detail.
- Edit recipe name/instructions.
- Duplicate recipe.
- Delete duplicate recipe.
- Delete original created recipe.

### Nutrition Plans

- List load.
- Create plan with macro targets.
- Add meal.
- Add food to meal with grams.
- Meal macro totals update.
- Assign meal to breakfast; daily totals update before reload.
- Create a second builder plan and edit plan name inline.
- Edit plan macro targets inline.
- Add two meals.
- Add two foods to one meal.
- Meal total updates after each added food.
- Assign meal to lunch; daily totals update before reload.
- Toggle `Customize days` and verify Monday view.
- Reload builder and verify meal items persist.
- Open meal item details.
- Remove a meal item; meal total updates from `231 kcal` to `180 kcal`.
- Expand a collapsed meal after reload.
- Collapse all meals.
- Open meal options menu.
- Delete created QA plan.
- No relevant console errors during the tested nutrition-plan flow.

## Notes

- Auth routes were not tested in this pass by request.
- Invite/resend/email actions were avoided.
- `just dev` was already running with coach app on `2021` and backend on `4000`.
