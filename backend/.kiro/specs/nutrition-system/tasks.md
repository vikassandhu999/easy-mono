# Implementation Plan

This implementation plan breaks down the nutrition system into discrete, manageable coding tasks. Each task builds incrementally on previous tasks, with all code properly integrated.

## Task List

- [x] 1. Create ingredients table migration
  - Define ingredients table with all fields (name, nutritional values, business_id, created_by_id, status)
  - Add indexes for business_id, status, and name
  - Add foreign key constraints for business and coach references
  - _Requirements: 1.1, 6.1_

- [x] 2. Create recipes table migration
  - Define recipes table with fields (name, description, instructions, servings, cached nutrition totals, business_id, created_by_id, status)
  - Add indexes for business_id, status, and name
  - Add foreign key constraints
  - _Requirements: 2.1, 6.1_

- [x] 3. Create recipe_ingredients join table migration
  - Define recipe_ingredients table (recipe_id, ingredient_id, quantity, unit, notes)
  - Add indexes for recipe_id and ingredient_id
  - Add unique constraint on recipe_id + ingredient_id combination
  - Add foreign key constraints with CASCADE delete for recipe
  - _Requirements: 2.2, 8.5_

- [x] 4. Create meals table migration
  - Define meals table (name, description, meal_type, cached nutrition totals, business_id, created_by_id, status)
  - Add indexes for business_id, status, meal_type, and name
  - Add foreign key constraints
  - _Requirements: 3.1, 6.1_

- [x] 5. Create meal_recipes join table migration
  - Define meal_recipes table (meal_id, recipe_id, servings, notes)
  - Add indexes for meal_id and recipe_id
  - Add unique constraint on meal_id + recipe_id combination
  - Add foreign key constraints with CASCADE delete for meal
  - _Requirements: 3.2, 8.5_

- [x] 6. Create meal_ingredients join table migration
  - Define meal_ingredients table (meal_id, ingredient_id, quantity, unit, notes)
  - Add indexes for meal_id and ingredient_id
  - Add foreign key constraints with CASCADE delete for meal
  - _Requirements: 3.3, 8.5_

- [x] 7. Create Ingredient schema
  - Create `lib/easy/nutrition/ingredient.ex` file
  - Define Ingredient schema with all fields (name, description, calories, protein, carbohydrates, fats, fiber, source, status)
  - Implement changeset with validations (required fields, non-negative nutritional values, status enum)
  - Add associations to business and coach
  - _Requirements: 1.1, 8.1_

- [x] 8. Implement ingredient context functions
  - Create `lib/easy/nutrition.ex` context module
  - Implement `create_ingredient/3` with business and coach validation
  - Implement `get_ingredient/1` to fetch single ingredient
  - Implement `list_ingredients/2` with business filtering and pagination
  - Implement `update_ingredient/2` with business validation
  - Implement `delete_ingredient/1` with usage check (prevent if used in recipes/meals)
  - Implement `search_ingredients/2` with name-based search within business
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.4_

- [x] 9. Create Recipe schema
  - Create `lib/easy/nutrition/recipe.ex` file
  - Define Recipe schema with all fields including cached nutrition totals
  - Implement changeset with validations (required fields, positive servings, status enum)
  - Add associations to business, coach, and recipe_ingredients
  - _Requirements: 2.1, 7.2_

- [x] 10. Create RecipeIngredient schema
  - Create `lib/easy/nutrition/recipe_ingredient.ex` file
  - Define RecipeIngredient schema (recipe_id, ingredient_id, quantity, unit, notes)
  - Implement changeset with validations (positive quantity, valid unit)
  - Add associations to recipe and ingredient
  - _Requirements: 2.2, 8.5_

- [x] 11. Implement recipe context functions
  - Add recipe functions to `lib/easy/nutrition.ex` context
  - Implement `create_recipe/3` with business and coach validation
  - Implement `get_recipe/2` with optional preloading
  - Implement `list_recipes/2` with business filtering and pagination
  - Implement `update_recipe/2` with business validation
  - Implement `delete_recipe/1` with usage check (prevent if used in meals)
  - Implement `search_recipes/2` with name-based search within business
  - _Requirements: 2.1, 2.4, 2.5, 2.6, 6.1, 7.2, 7.4_

- [x] 12. Implement recipe ingredient management functions
  - Add to `lib/easy/nutrition.ex` context
  - Implement `add_ingredient_to_recipe/4` to add ingredient with quantity and unit
  - Implement `remove_ingredient_from_recipe/2` to remove ingredient from recipe
  - Implement `update_recipe_ingredient/3` to modify quantity or unit
  - Add validation to prevent duplicate ingredients in same recipe
  - _Requirements: 2.2, 7.2, 8.5_

- [x] 13. Create nutritional calculations module
  - Create `lib/easy/nutrition/calculations.ex` file
  - Implement `convert_to_grams/2` for various units (g, kg, ml, l, cup, tbsp, tsp, oz)
  - Implement `calculate_ingredient_nutrition/2` to scale per-100g values by quantity
  - Implement `calculate_recipe_nutrition/1` to aggregate all recipe ingredients
  - Implement `sum_nutritional_values/1` helper to aggregate nutrition maps
  - Use Decimal for precise calculations
  - _Requirements: 2.3, 5.1, 5.2, 5.3, 5.5_

- [x] 14. Create Meal schema
  - Create `lib/easy/nutrition/meal.ex` file
  - Define Meal schema with all fields including cached nutrition totals
  - Implement changeset with validations (required fields, meal_type enum, status enum)
  - Add associations to business, coach, meal_recipes, and meal_ingredients
  - _Requirements: 3.1, 3.6_

- [x] 15. Create MealRecipe schema
  - Create `lib/easy/nutrition/meal_recipe.ex` file
  - Define MealRecipe schema (meal_id, recipe_id, servings, notes)
  - Implement changeset with validations (positive servings)
  - Add associations to meal and recipe
  - Add unique constraint on meal_id + recipe_id
  - _Requirements: 3.2, 8.5_

- [x] 16. Create MealIngredient schema
  - Create `lib/easy/nutrition/meal_ingredient.ex` file
  - Define MealIngredient schema (meal_id, ingredient_id, quantity, unit, notes)
  - Implement changeset with validations (positive quantity, valid unit)
  - Add associations to meal and ingredient
  - _Requirements: 3.3, 8.5_

- [x] 17. Implement meal context functions
  - Add meal functions to `lib/easy/nutrition.ex` context
  - Implement `create_meal/3` with business and coach validation
  - Implement `get_meal/2` with optional preloading
  - Implement `list_meals/2` with business filtering, meal_type filtering, and pagination
  - Implement `update_meal/2` with business validation
  - Implement `delete_meal/1` with proper cleanup
  - _Requirements: 3.1, 3.5, 3.6, 6.1_

- [x] 18. Implement meal component management functions
  - Add to `lib/easy/nutrition.ex` context
  - Implement `add_recipe_to_meal/3` to add recipe with serving multiplier
  - Implement `add_ingredient_to_meal/4` to add ingredient with quantity and unit
  - Implement `remove_recipe_from_meal/2` to remove recipe from meal
  - Implement `remove_ingredient_from_meal/2` to remove ingredient from meal
  - Implement `update_meal_recipe/3` to modify servings
  - Implement `update_meal_ingredient/3` to modify quantity or unit
  - Add validation to prevent duplicate recipes/ingredients in same meal
  - _Requirements: 3.2, 3.3, 7.2, 8.5_

- [x] 19. Implement meal nutrition calculation
  - Add to `lib/easy/nutrition.ex` context
  - Implement `calculate_meal_nutrition/1` to aggregate recipes and ingredients
  - Calculate nutrition from meal_recipes (recipe totals × servings)
  - Calculate nutrition from meal_ingredients (ingredient values × quantity)
  - Sum all nutritional values using Calculations module
  - Update meal's cached nutrition totals
  - _Requirements: 3.4, 5.2, 5.3_

- [x] 20. Implement meal duplication function
  - Add to `lib/easy/nutrition.ex` context
  - Implement `duplicate_meal/2` to create copy of existing meal
  - Copy all meal_recipes with servings
  - Copy all meal_ingredients with quantities
  - Append " (Copy)" to meal name
  - Recalculate nutritional values for new meal
  - Associate with same business
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 21. Implement business context validation helpers
  - Add permission validation functions to `lib/easy/nutrition.ex` context
  - Implement `validate_coach_in_business/2` to check coach-business relationship
  - Implement `validate_resource_in_business/2` to check resource belongs to business
  - Ensure all list queries filter by business_id
  - Ensure all create/update/delete functions validate business access
  - Return clear error tuples for unauthorized access (`:unauthorized`)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 22. Implement deletion protection for resources in use
  - Add usage check functions to `lib/easy/nutrition.ex` context
  - Implement ingredient usage check (check recipe_ingredients and meal_ingredients)
  - Implement recipe usage check (check meal_recipes)
  - Return `{:error, :ingredient_in_use}` or `{:error, :recipe_in_use}` when appropriate
  - Allow deletion only if no references exist
  - _Requirements: 1.4, 7.4_

- [x] 23. Create IngredientController
  - Create `lib/easy_web/controllers/ingredient_controller.ex` file
  - Implement `index` action to list ingredients for business
  - Implement `create` action with validation
  - Implement `show` action to get single ingredient
  - Implement `update` action with permission check
  - Implement `delete` action with usage check
  - Add JSON error handling using FallbackController
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 24. Create RecipeController
  - Create `lib/easy_web/controllers/recipe_controller.ex` file
  - Implement `index` action to list recipes for business
  - Implement `create` action with validation
  - Implement `show` action with preloaded ingredients
  - Implement `update` action with permission check
  - Implement `delete` action with usage check
  - Implement nested actions for managing recipe ingredients (add_ingredient, remove_ingredient, update_ingredient)
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_

- [x] 25. Create MealController
  - Create `lib/easy_web/controllers/meal_controller.ex` file
  - Implement `index` action to list meals for business
  - Implement `create` action with validation
  - Implement `show` action with preloaded recipes and ingredients
  - Implement `update` action with permission check
  - Implement `delete` action
  - Implement `duplicate` action for meal copying
  - Implement nested actions for managing meal components (add_recipe, add_ingredient, remove_recipe, remove_ingredient, update_recipe, update_ingredient)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_

- [x] 26. Add nutrition routes to router
  - Update `lib/easy_web/router.ex` to add nutrition routes
  - Add `/api/businesses/:business_id/ingredients` routes (index, create, show, update, delete)
  - Add `/api/businesses/:business_id/recipes` routes (index, create, show, update, delete)
  - Add `/api/businesses/:business_id/recipes/:recipe_id/ingredients` routes (create, update, delete)
  - Add `/api/businesses/:business_id/meals` routes (index, create, show, update, delete, duplicate)
  - Add `/api/businesses/:business_id/meals/:meal_id/recipes` routes (create, update, delete)
  - Add `/api/businesses/:business_id/meals/:meal_id/ingredients` routes (create, update, delete)
  - Ensure all routes use `:authenticated` pipeline
  - _Requirements: All requirements (routing)_

- [x] 27. Enhance FallbackController for nutrition errors
  - Update `lib/easy_web/controllers/fallback_controller.ex` if needed
  - Ensure it handles `{:error, :ingredient_in_use}` with 422 response
  - Ensure it handles `{:error, :recipe_in_use}` with 422 response
  - Ensure it handles `{:error, :unauthorized}` with 403 response
  - Ensure it handles `{:error, :not_found}` with 404 response
  - Ensure it handles `{:error, changeset}` with 422 response and field errors
  - _Requirements: 8.4_

- [ ]* 28. Add module and function documentation
  - Add @moduledoc to all nutrition modules (Nutrition context, Calculations, schemas)
  - Add @doc to all public functions in Nutrition context
  - Include parameter descriptions and return value descriptions
  - Add usage examples for common operations
  - Document permission model and business scoping
  - _Requirements: All requirements_

- [ ]* 29. Create API endpoint documentation
  - Create Bruno collection in `Easy/` directory for nutrition endpoints
  - Document all ingredient endpoints with request/response examples
  - Document all recipe endpoints with request/response examples
  - Document all meal endpoints with request/response examples
  - Include authentication headers in examples
  - Document error responses
  - _Requirements: All requirements_
