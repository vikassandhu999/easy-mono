# Nutrition library

Owner: Nutrition

## Supported outcome

A coaching business can maintain shared business-owned foods and recipes for building nutrition plans and logging intake while retaining a read-only globally shared food library as starting content.

## Available information

* Food collection: matching count, name search, pagination, globally shared foods, and foods owned by the current business. Each food carries a system, imported, or custom source label.
* Food: name, brand, barcode, source, category, per-100-gram calories, protein, carbohydrates, fat, and fiber; allergens; dietary tags; notes; image reference; serving sizes; creation time; and last update time.
* Serving size: optional label and amount, unit, gram weight, and default marker.
* Recipe collection: matching count, name search, pagination, and recipes from the current business.
* Recipe: name, description, instructions, servings count, cooked gram weight, allergens, dietary tags, serving sizes, ordered food ingredients, calculated nutrition totals, creation time, and last update time.
* Ingredient: visible food, positive gram weight, optional amount and unit, and position.
* Usage impact: reusable nutrition plans and active assigned plans that directly contain a selected food or recipe as a meal item.

## Supported actions

* Any coach can browse, search, and inspect visible foods and business-owned recipes.
* An active client can browse, search, and inspect the same foods and business-owned recipes for nutrition logging.
* Any coach can create a business-owned food, edit or delete an editable business-owned food, and copy a visible food into editable business-owned content.
* Any coach can create, edit, duplicate, or delete a business-owned recipe and can replace its ordered ingredient collection.
* Before a destructive food or recipe action, a coach can inspect the reusable plans and active assigned plans that directly reference it.

## Lifecycle

* Foods with a system or imported source are read-only. Custom business-owned foods and all business-owned recipes are shared editable content within one business.
* A food copy becomes a custom business-owned food with copied serving sizes and nutritional information. A recipe copy becomes an independent business-owned recipe with copied fields, serving sizes, and ingredients.
* Food and recipe edits are live. Reusable and assigned plans always calculate from current library definitions; nutrition-log snapshots independently retain historical values.
* Logged items retain their saved names and macros after later library edits. Stored names and macros preserve context if a live reference is ever absent.
* Deleting a food used only as a recipe ingredient can remove that ingredient's live food link. Deleting a food or recipe directly referenced by a plan meal item or logged item is rejected by integrity constraints, without a recoverable domain response. The product has no complete dependency-safe deletion transaction.

## Conditions

* A business can see globally shared foods, its own business-owned foods, and its own recipes, never another business's content.
* The owner and trainers share one business library. Content is not private to its creator.
* A recipe ingredient can use a globally shared food or a business-owned food from the same business.
* Food and recipe usage impact includes direct plan meal items. It does not include every indirect or historical dependency.
* Client access requires an active client account.

## UX-relevant constraints

* Food and recipe names are required and accept at most 255 characters. Duplicate names are allowed.
* Food macro values, when present, must be zero or greater. A serving size requires a unit and gram weight, but positive bounds and exactly one default are not enforced.
* Supported allergens are dairy, egg, fish, shellfish, tree nuts, peanuts, wheat, soy, and sesame.
* Supported dietary tags are vegan, vegetarian, halal, kosher, gluten free, dairy free, low FODMAP, keto, and high protein.
* Coach-created food should be custom. The request currently accepts system or imported source labels, which can make a newly created business-owned food immediately read-only. This is an implementation hazard rather than a useful authoring choice.
* A recipe ingredient requires a positive gram weight. Ingredient amount and unit are descriptive and optional.
* Recipe totals are calculated from ingredient gram weights and current food macros. Missing food macros contribute zero.
* A positive cooked weight allows recipe macros to scale by grams. Without one, gram-based recipe calculation returns the whole-recipe total; serving-based plan items instead divide totals by servings count.
* Servings count and cooked weight have no dependable positive validation. Invalid or absent values fall back inconsistently in later calculations.
* Food impact does not include use inside a recipe, and both food and recipe impact omit archived assigned plans. Impact therefore cannot prove that deletion is safe.
* Deletion is not guarded by a complete domain-level dependency rule. A recipe-only food reference can be detached, while direct plan or logged-item references can reject deletion without a useful recovery response.
* Images are string references. Barcode scanning, image upload, and media recovery are not part of this capability.

## Related capabilities

* Nutrition plan authoring and assignment: uses foods and recipes as plan meal items and recalculates meal totals from live definitions.
* Nutrition logging and history: lets clients select foods and recipes and stores names and macros at logging time.
* Attachments: would own an upload workflow if food images stop being external string references.

## Unsupported assumptions

* Private trainer libraries, per-item permissions, approvals, publishing, versions, and rollback are not supported.
* A safe deletion guarantee based on all direct, indirect, archived, and historical usage is not supported.
* Barcode lookup, external database search, automated import, label scanning, and restaurant-menu lookup are not supported workflows.
* Automatic allergen detection, dietary-tag inference, nutritional verification, and duplicate detection are not supported.
* Recipe subrecipes, ingredient groups, preparation timers, cooking-step media, and shopping-list generation require product work.

## Verification evidence

* `backend/lib/easy/foods.ex`, `backend/lib/easy/nutrition/food.ex`, and `backend/lib/easy/nutrition/serving_size.ex`: food visibility, editing, copying, validation, search, and serving sizes.
* `backend/lib/easy/recipes.ex`, `backend/lib/easy/nutrition/recipe.ex`, and `backend/lib/easy/nutrition/recipe_ingredient.ex`: recipe actions, ingredients, copying, and validation.
* `backend/lib/easy/macro_calc.ex`: food, recipe, serving, and meal calculations.
* `backend/lib/easy_web/open_api/schemas/nutrition.ex` and `backend/lib/easy_web/open_api/schemas/nutrition_food.ex`: supported request and response information.
* `backend/test/easy_web/controllers/coaches/food_controller_test.exs`, `backend/test/easy_web/controllers/coaches/recipe_controller_test.exs`, and their client-controller tests: library behavior, impact, read-only sources, and tenant isolation.
* `backend/priv/repo/migrations/20260703000200_create_nutrition.exs`: reference behavior for foods, recipes, ingredients, and plan meal items.
