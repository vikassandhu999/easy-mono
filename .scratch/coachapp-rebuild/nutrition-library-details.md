# Food serving sizes and recipe tags

A coach should be able to prescribe a familiar portion without repeatedly converting it to grams. Food editing now offers serving names, amounts, units and weights together. Choose one default; gram portions remain available. New and removed servings stay in the form until Save food. Undo restores the removed serving and its default choice; saving or loading a different revision clears the old Undo action.

The API owns portion resolution, nutrition and protection of referenced serving identities. Removing or renaming a serving used by a recipe or plan retains the draft and explains the dependency, without misclassifying the response as a stale revision. Existing food media is preserved. The pure food form mapping lives in `foods/food.ts`; serving controls remain private to the food feature.

Recipe editing adds Allergens and dietary tags in a separate disclosure. It shares the existing food tag controls through `ui/nutrition-tags.tsx`. Tags remain coach-entered declarations and do not update automatically when ingredients change. Clearing every checkbox sends an explicit empty array. Existing revision, request-recovery and session checks apply.

Recipe saves and copies invalidate food usage lists as well as recipe lists. Coaches returning through the app see the new recipe reference count without manually refreshing.

Verified on 2026-09-14: the food, recipe and nutrition-library-management browser suites pass at 375px and 1280px. Coverage includes positive serving validation, real portion reuse in a meal plan, default changes, removal/Undo, protected referenced servings, tag creation/clearing, failed-save recovery, copied-portion/tag preservation, retained usage counts and session replacement. Viewport screenshots of serving controls and recipe tags were reviewed. Coachapp build, scoped Biome and `just check-rm` pass. Backend code and its generated contract are unchanged in this slice; the preceding checkpoint passed full `mix precommit` with 1,769 tests. Food media authoring and picker reuse now follow in food-media.md.
