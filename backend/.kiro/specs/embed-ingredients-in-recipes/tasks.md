# Implementation Plan

This implementation plan converts the nutrition system to use embedded ingredient names (text arrays) instead of separate ingredient entities. Tasks are ordered to ensure incremental progress with each step building on the previous ones.

## Tasks

- [x] 1. Add ingredients text array column to recipes table
  - Create migration to add `ingredients TEXT[]` column to recipes table with default empty array
  - Add GIN index on ingredients column for efficient searching
  - Run migration in development environment
  - _Requirements: 1.4, 1.5_

- [x] 2. Update Recipe schema to support embedded ingredients
  - Add `ingredients` field as `{:array, :string}` type in Recipe schema
  - Remove `has_many :recipe_ingredients` association
  - Remove `has_many :ingredients, through: [:recipe_ingredients, :ingredient]` association
  - Update `create_changeset/2` to cast and validate ingredients array
  - Update `update_changeset/2` to cast and validate ingredients array
  - Add private validation function to validate ingredient names (non-empty, max 255 chars, trim whitespace)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 7.1, 7.2, 7.4, 7.5_

- [x] 3. Update Meal schema to remove ingredient associations
  - Remove `has_many :meal_ingredients` association from Meal schema
  - Remove `has_many :ingredients, through: [:meal_ingredients, :ingredient]` association
  - Keep `has_many :meal_recipes` and `has_many :recipes, through: [:meal_recipes, :recipe]` associations
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 4. Remove ingredient-related functions from Nutrition context
  - Remove `create_ingredient/3` function
  - Remove `get_ingredient/1` function
  - Remove `list_ingredients/2` function
  - Remove `update_ingredient/3` function
  - Remove `delete_ingredient/2` function
  - Remove `search_ingredients/2` function
  - Remove `validate_ingredient_in_business/2` function
  - Remove `ingredient_in_use?/1` private function
  - Remove `fetch_ingredient/1` private function
  - _Requirements: 6.3_

- [x] 5. Remove recipe-ingredient association functions from Nutrition context
  - Remove `add_ingredient_to_recipe/5` function
  - Remove `remove_ingredient_from_recipe/3` function
  - Remove `update_recipe_ingredient/4` function
  - Update `get_recipe/2` to remove ingredient preload options
  - _Requirements: 6.4_

- [x] 6. Remove meal-ingredient association functions from Nutrition context
  - Remove `add_ingredient_to_meal/5` function
  - Remove `remove_ingredient_from_meal/3` function
  - Remove `update_meal_ingredient/4` function
  - _Requirements: 2.1, 6.5_

- [x] 7. Remove nutritional calculation functions from Nutrition context
  - Remove `calculate_meal_nutrition/1` function
  - Remove `calculate_meal_recipes_nutrition/1` private function
  - Remove `calculate_meal_ingredients_nutrition/1` private function
  - Remove `multiply_or_zero/2` private function
  - _Requirements: 3.3_

- [x] 8. Remove Calculations module
  - Delete `lib/easy/nutrition/calculations.ex` file entirely
  - Remove any imports or aliases to Calculations module in other files
  - _Requirements: 3.3_

- [x] 9. Update recipe duplication to handle embedded ingredients
  - Modify `duplicate_meal/2` function to copy ingredients array when duplicating recipes
  - Remove calculation call after duplication since nutrition is manual
  - _Requirements: 1.2_

- [x] 10. Create data migration to convert existing ingredients to embedded format
  - Create migration that uses ARRAY_AGG to convert recipe_ingredients join table data to text array
  - Join with ingredients table to get ingredient names
  - Handle recipes with no ingredients (set to empty array)
  - Handle missing ingredient references gracefully
  - _Requirements: 4.1, 4.2_

- [x] 11. Create migration to drop old ingredient tables
  - Drop meal_ingredients table
  - Drop recipe_ingredients table
  - Drop ingredients table
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 12. Remove Ingredient schema file
  - Delete `lib/easy/nutrition/ingredient.ex` file
  - Remove any imports or aliases to Ingredient schema in other files
  - _Requirements: 4.3_

- [x] 13. Remove RecipeIngredient schema file
  - Delete `lib/easy/nutrition/recipe_ingredient.ex` file
  - Remove any imports or aliases to RecipeIngredient schema in other files
  - _Requirements: 4.4_

- [x] 14. Remove MealIngredient schema file
  - Delete `lib/easy/nutrition/meal_ingredient.ex` file
  - Remove any imports or aliases to MealIngredient schema in other files
  - _Requirements: 4.5_

- [x] 15. Remove MealRecipe schema file
  - Delete `lib/easy/nutrition/meal_recipe.ex` file
  - Remove any imports or aliases to MealRecipe schema in other files
  - Update Meal and Recipe schemas to remove meal_recipes associations if no longer needed
  - _Requirements: 2.5_

- [x] 16. Update API controllers to handle new recipe format
  - Update recipe controller to accept ingredients as array of strings in create/update actions
  - Update recipe controller to return ingredients array in show/index actions
  - Remove ingredient controller endpoints if they exist
  - Update meal controller to remove meal_ingredient endpoints if they exist
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 17. Run mix format and fix any compilation errors
  - Run `mix format` to format all modified files
  - Run `mix compile` to check for compilation errors
  - Fix any remaining compilation errors or warnings
  - _Requirements: All_

- [x] 18. Update documentation and API examples
  - Update module documentation in Nutrition context
  - Update API documentation to reflect new recipe/meal format
  - Add examples showing how to create recipes with ingredient arrays
  - Document that nutritional values are manually entered
  - _Requirements: 6.1, 6.2_
