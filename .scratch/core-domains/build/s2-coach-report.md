# Slice 2 coach app

## Screen brief

The coach starts in the Nutrition library, creates or edits foods and recipes, builds a reusable prescription, and assigns a copy to one client. The primary builder action saves the whole content document once. Client plans publish a revision today or on a selected future date. The history screen reads expected and recorded meals for a day or week and shows food metrics for that week.

Loading, empty, error and retry states use the existing query and list components. Edits stay in the form after a failed save. A revision conflict offers the saved version for review. An uncertain template creation requires checking saved plans before a new attempt. Navigation warns before discarding unsaved edits.

## Changes

- Food forms write the nutrient map. Blank values remain absent; explicit zero is kept. Existing micronutrient map entries survive edits to the displayed nutrients. Servings have stable ids, labels and gram weights, with an optional default id. Existing media, tags, category search and paginated food lists remain.
- Recipe forms write `ingredients` directly, with tagged gram or stable-serving portions. Ingredient names and serving choices load from the food API. Cooked weight, recipe yield, instructions, allergens and dietary tags remain. The saved nutrition display clearly says per 100 g and keeps unknown values distinct.
- The builder edits range targets, reusable meals and food/recipe items, named day patterns, whole target overrides, custom slots and a seven-entry weekly schedule. It saves name, description and content in one request.
- Client plans publish now or later, preview scheduled content, withdraw future revisions, and show the P4 notice. Published prescription values stay visible after library edits.
- Assignment uses the shared plan response. Template and client-plan lists keep pagination, search and archive handling. Client-plan management uses future-only date rules and archive; permanent client-plan deletion is removed.
- Library removal archives foods and recipes. The UI explains this and keeps published prescriptions and records. Interrupted removal can reconcile an archived response as success.
- Day and week history show expected and recorded slot counts, `Not recorded`, nutrient totals with known-entry counts, target ranges, the published revision number, and the target-changed notice. Food metrics include direct foods and the foods in recorded recipes. Chat meal references resolve the new meal and entry shape.
- Added model behavior tests. Obsolete nutrition browser scenarios were removed; their package commands use the new slice-2 live flow. The recipe browser flow was rewritten for the new library model. The visual hierarchy fixture uses the new contract.

## Choices where the documents were silent

1. New templates start with one `Everyday` pattern and seven stable schedule entries. It has no slots or meals until the coach adds them.
2. Target fields show minimum and maximum together. Matching values mean exact; minimum alone means at least. Pattern overrides start as a copy of the plan targets and then replace them as one map.
3. Meals form a reusable list. Each custom slot selects its offered meals. Removing a meal removes its offered references but preserves slot identities. Removing a day pattern requires a replacement for its scheduled days; schedule-entry identities are preserved.
4. Food metrics use the week containing the selected date. Day and week navigation changes that range. The API remains able to read other explicit ranges.
5. Food defaults are optional. Without a default serving, the picker starts with 100 grams. A recipe starts with its standard serving. Recipe nutrition is displayed per 100 grams, consistent with the new API.
6. Library removal always archives, including unused items, matching the backend.
7. The coach UI shows calories, protein, carbs, fat, fiber and sugar. Other map keys are preserved by food edits.

## Verification

- `rtk pnpm -C frontend/apps/coachapp build`: passed after the new generated contract; includes TypeScript, existing checks, five new Nutrition behavior tests, and Vite.
- `rtk pnpm -C frontend lint:design`: passed.
- `rtk pnpm -C frontend lint:ci`: passed on the integrated frontend source (Biome and design lint).
- `rtk proxy node tests/recipes/recipes.browser.mjs` from coachapp: passed at 375 px and 1280 px. It creates a recipe with stable serving portions and cooked yield, checks missing fiber stays unknown, saves tags, simulates a failed PATCH, preserves the draft, and retries successfully. Screenshots are `s2-screens/recipe-editor-375.png` and `recipe-editor-1280.png`.
- `rtk proxy env HIERARCHY_PHASE=s2 rtk pnpm test:visual-hierarchy` from coachapp passed all 16 screen/viewport combinations. Evidence is in `/tmp/coachapp-hierarchy/s2`. The root agent owns the combined training and Nutrition live flows and their screenshots.

The browser uses a disposable local test account. No commit or push was made. The retained clientapp-v2 was not edited by this work.
