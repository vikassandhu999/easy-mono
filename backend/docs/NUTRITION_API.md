# Nutrition API Documentation

## Overview

The Nutrition API provides recipe and meal management with embedded ingredients. This document describes the simplified architecture and API usage.

## Architecture

The nutrition system uses a simplified architecture:

- **Recipes** contain embedded ingredient names as a PostgreSQL text array
- **Meals** contain one or more recipes (no direct ingredient associations)
- **Nutritional values** are manually entered by coaches, not automatically calculated

### Data Model

```
Business
  ├── Recipes
  │     └── ingredients: TEXT[] (embedded ingredient names)
  └── Meals
        └── MealRecipes (join table) → Recipes
```

## Embedded Ingredients

Ingredients are stored as simple text names within recipes using PostgreSQL's native text array type. This eliminates the need for separate ingredient tables and join tables.

### Example Recipe Structure

```elixir
%Recipe{
  id: "123e4567-e89b-12d3-a456-426614174000",
  business_id: "business-uuid",
  created_by_id: "coach-uuid",
  name: "Grilled Chicken Salad",
  description: "Healthy protein-packed salad",
  servings: 2,
  prep_time_minutes: 20,
  instructions: "1. Grill chicken\n2. Chop vegetables\n3. Mix together",
  ingredients: [
    "Chicken Breast",
    "Mixed Greens",
    "Cherry Tomatoes",
    "Cucumber",
    "Olive Oil",
    "Lemon Juice"
  ],
  total_calories: #Decimal<450>,
  total_protein: #Decimal<52>,
  total_carbohydrates: #Decimal<15>,
  total_fats: #Decimal<18>,
  total_fiber: #Decimal<5>,
  status: "active"
}
```

## Recipe Management

### Creating a Recipe

Create a recipe with embedded ingredients and manual nutrition values:

```elixir
{:ok, recipe} = Easy.Nutrition.create_recipe(business_id, coach_id, %{
  name: "Grilled Chicken Salad",
  description: "Healthy protein-packed salad",
  servings: 2,
  prep_time_minutes: 20,
  instructions: "1. Grill chicken\n2. Chop vegetables\n3. Mix together",
  ingredients: [
    "Chicken Breast",
    "Mixed Greens",
    "Cherry Tomatoes",
    "Cucumber",
    "Olive Oil",
    "Lemon Juice"
  ],
  total_calories: Decimal.new("450"),
  total_protein: Decimal.new("52"),
  total_carbohydrates: Decimal.new("15"),
  total_fats: Decimal.new("18"),
  total_fiber: Decimal.new("5")
})
```

### Updating Recipe Ingredients

Update a recipe's ingredients by replacing the entire array:

```elixir
{:ok, updated_recipe} = Easy.Nutrition.update_recipe(recipe, coach_id, %{
  ingredients: [
    "Chicken Breast",
    "Mixed Greens",
    "Cherry Tomatoes",
    "Cucumber",
    "Olive Oil",
    "Lemon Juice",
    "Feta Cheese"  # Added new ingredient
  ]
})
```

### Updating Nutritional Values

Update nutritional values independently:

```elixir
{:ok, updated_recipe} = Easy.Nutrition.update_recipe(recipe, coach_id, %{
  total_calories: Decimal.new("500"),
  total_protein: Decimal.new("55")
})
```

### Getting a Recipe

Retrieve a recipe with optional preloading:

```elixir
# Get recipe without associations
recipe = Easy.Nutrition.get_recipe(recipe_id)

# Get recipe with business and creator
recipe = Easy.Nutrition.get_recipe(recipe_id, [:business, :created_by])
```

### Listing Recipes

List recipes within a business context:

```elixir
# List all active recipes
recipes = Easy.Nutrition.list_recipes(business_id)

# List with pagination and filtering
recipes = Easy.Nutrition.list_recipes(business_id,
  limit: 20,
  offset: 0,
  status: "active",
  order_by: :name
)
```

### Searching Recipes

Search recipes by name:

```elixir
recipes = Easy.Nutrition.search_recipes(business_id, "chicken")
# Returns: [%Recipe{name: "Grilled Chicken"}, %Recipe{name: "Chicken Salad"}]
```

### Deleting a Recipe

Delete a recipe (prevents deletion if used in meals):

```elixir
{:ok, deleted_recipe} = Easy.Nutrition.delete_recipe(recipe, coach_id)
# Or: {:error, :recipe_in_use}
```

## Meal Management

### Creating a Meal

Create a meal with manual nutrition values:

```elixir
{:ok, meal} = Easy.Nutrition.create_meal(business_id, coach_id, %{
  name: "Lunch",
  meal_type: "lunch",
  description: "Balanced lunch meal",
  total_calories: Decimal.new("650"),
  total_protein: Decimal.new("60"),
  total_carbohydrates: Decimal.new("45"),
  total_fats: Decimal.new("25"),
  total_fiber: Decimal.new("8")
})
```

Valid meal types: `"breakfast"`, `"lunch"`, `"dinner"`, `"snack"`

### Adding Recipes to a Meal

Add recipes to a meal with serving multipliers:

```elixir
# Add one serving of a recipe
{:ok, meal_recipe} = Easy.Nutrition.add_recipe_to_meal(
  meal.id,
  recipe.id,
  Decimal.new("1.0")
)

# Add 1.5 servings of another recipe
{:ok, meal_recipe} = Easy.Nutrition.add_recipe_to_meal(
  meal.id,
  another_recipe.id,
  Decimal.new("1.5")
)
```

### Updating Meal Recipe Servings

Update the serving multiplier or notes for a recipe in a meal:

```elixir
{:ok, meal_recipe} = Easy.Nutrition.update_meal_recipe(
  meal.id,
  recipe.id,
  %{servings: Decimal.new("2.0"), notes: "Double portion"}
)
```

### Removing Recipes from a Meal

Remove a recipe from a meal:

```elixir
{:ok, meal_recipe} = Easy.Nutrition.remove_recipe_from_meal(meal.id, recipe.id)
```

### Getting a Meal

Retrieve a meal with optional preloading:

```elixir
# Get meal without associations
meal = Easy.Nutrition.get_meal(meal_id)

# Get meal with recipes (includes embedded ingredients)
meal = Easy.Nutrition.get_meal(meal_id, [:recipes])

# Get meal with meal_recipes for serving multipliers
meal = Easy.Nutrition.get_meal(meal_id, [:meal_recipes])
```

### Listing Meals

List meals within a business context:

```elixir
# List all active meals
meals = Easy.Nutrition.list_meals(business_id)

# List with filtering
meals = Easy.Nutrition.list_meals(business_id,
  limit: 20,
  offset: 0,
  meal_type: "breakfast",
  status: "active"
)
```

### Updating a Meal

Update meal attributes:

```elixir
{:ok, updated_meal} = Easy.Nutrition.update_meal(meal, coach_id, %{
  name: "Updated Lunch",
  total_calories: Decimal.new("700")
})
```

### Duplicating a Meal

Duplicate a meal with all its recipes:

```elixir
{:ok, duplicated_meal} = Easy.Nutrition.duplicate_meal(meal_id, coach_id)
# Creates: %Meal{name: "Original Meal (Copy)", ...}
```

Note: Nutritional values are not copied and must be manually entered.

### Deleting a Meal

Delete a meal (cascades to meal_recipes):

```elixir
{:ok, deleted_meal} = Easy.Nutrition.delete_meal(meal, coach_id)
```

## Validation Rules

### Recipe Validation

- **Name**: Required, 1-255 characters
- **Servings**: Must be a positive integer
- **Prep time**: Must be a non-negative integer
- **Ingredients**: 
  - Must be a list of strings
  - Each ingredient must be non-empty
  - Each ingredient max 255 characters
  - Whitespace is automatically trimmed
  - Duplicate names are allowed
- **Nutritional values**: Must be non-negative decimals
- **Status**: Must be "active" or "archived"

### Meal Validation

- **Name**: Required, 1-255 characters
- **Meal type**: Must be one of: "breakfast", "lunch", "dinner", "snack"
- **Nutritional values**: Must be non-negative decimals
- **Status**: Must be "active" or "archived"

### Meal Recipe Validation

- **Servings**: Must be a positive decimal (e.g., 1.0, 1.5, 2.0)
- **Recipe**: Must exist and belong to the same business as the meal
- **Uniqueness**: Cannot add the same recipe to a meal twice

## Authorization

All operations validate that:

1. The coach belongs to the specified business
2. Resources (recipes, meals) belong to the same business as the coach
3. Cross-business access is prevented

### Authorization Errors

```elixir
# Coach doesn't belong to business
{:error, :unauthorized}

# Recipe and meal belong to different businesses
{:error, :business_mismatch}

# Resource not found
{:error, :recipe_not_found}
{:error, :meal_not_found}
```

## Error Handling

### Common Error Responses

```elixir
# Validation errors
{:error, %Ecto.Changeset{
  errors: [
    ingredients: {"must contain non-empty strings with maximum length of 255 characters", []},
    servings: {"must be a positive integer", []},
    total_calories: {"must be non-negative", []}
  ]
}}

# Authorization errors
{:error, :unauthorized}

# Resource not found
{:error, :recipe_not_found}
{:error, :meal_not_found}

# Business logic errors
{:error, :recipe_in_use}
{:error, :business_mismatch}
```

## Migration Notes

### Removed Functionality

The following functions and tables have been removed:

**Removed Tables:**
- `ingredients` - Ingredients are now embedded in recipes
- `recipe_ingredients` - Join table no longer needed
- `meal_ingredients` - Meals only contain recipes

**Removed Functions:**
- `create_ingredient/3`
- `get_ingredient/1`
- `list_ingredients/2`
- `update_ingredient/3`
- `delete_ingredient/2`
- `search_ingredients/2`
- `add_ingredient_to_recipe/5`
- `remove_ingredient_from_recipe/3`
- `update_recipe_ingredient/4`
- `add_ingredient_to_meal/5`
- `remove_ingredient_from_meal/3`
- `update_meal_ingredient/4`
- `calculate_meal_nutrition/1`

### Data Migration

Existing ingredient data was migrated to embedded format:

1. Recipe ingredients were converted to text arrays containing ingredient names
2. Old ingredient, recipe_ingredients, and meal_ingredients tables were dropped
3. Recipes with no ingredients were set to empty arrays

## Best Practices

### Creating Recipes

1. **Always provide ingredient names** when creating recipes
2. **Manually enter nutritional values** - they are not calculated
3. **Use descriptive ingredient names** (e.g., "Chicken Breast" not "chicken")
4. **Trim whitespace** is automatic, but use clean names

### Managing Meals

1. **Add recipes to meals** rather than individual ingredients
2. **Use serving multipliers** to adjust recipe quantities (e.g., 1.5 for 1.5 servings)
3. **Manually enter meal nutrition** based on the recipes included
4. **Duplicate meals** to create variations quickly

### Updating Ingredients

When updating recipe ingredients, remember:

1. **The entire array is replaced** - include all ingredients you want to keep
2. **Order matters** if you want to maintain a specific sequence
3. **Duplicates are allowed** if needed for the recipe

### Performance

1. **Use GIN indexes** for ingredient searches (already configured)
2. **Preload associations** when needed to avoid N+1 queries
3. **Use pagination** for large lists of recipes or meals

## Examples

### Complete Recipe Workflow

```elixir
# 1. Create a recipe
{:ok, recipe} = Easy.Nutrition.create_recipe(business_id, coach_id, %{
  name: "Protein Smoothie",
  servings: 1,
  prep_time_minutes: 5,
  ingredients: ["Protein Powder", "Banana", "Almond Milk", "Peanut Butter"],
  total_calories: Decimal.new("350"),
  total_protein: Decimal.new("30")
})

# 2. Update ingredients
{:ok, recipe} = Easy.Nutrition.update_recipe(recipe, coach_id, %{
  ingredients: ["Protein Powder", "Banana", "Almond Milk", "Peanut Butter", "Spinach"]
})

# 3. Update nutrition
{:ok, recipe} = Easy.Nutrition.update_recipe(recipe, coach_id, %{
  total_calories: Decimal.new("360"),
  total_fiber: Decimal.new("5")
})
```

### Complete Meal Workflow

```elixir
# 1. Create a meal
{:ok, meal} = Easy.Nutrition.create_meal(business_id, coach_id, %{
  name: "Post-Workout Meal",
  meal_type: "snack",
  total_calories: Decimal.new("500"),
  total_protein: Decimal.new("45")
})

# 2. Add recipes
{:ok, _} = Easy.Nutrition.add_recipe_to_meal(meal.id, smoothie_recipe.id, Decimal.new("1.0"))
{:ok, _} = Easy.Nutrition.add_recipe_to_meal(meal.id, protein_bar_recipe.id, Decimal.new("1.0"))

# 3. Get meal with recipes
meal = Easy.Nutrition.get_meal(meal.id, [:recipes])

# 4. Duplicate for another client
{:ok, duplicated_meal} = Easy.Nutrition.duplicate_meal(meal.id, coach_id)
```

## Summary

The nutrition system now uses a simplified architecture with:

- **Embedded ingredients** as text arrays in recipes
- **Manual nutrition entry** for recipes and meals
- **Meals containing only recipes** (no direct ingredients)
- **Simplified data model** with fewer tables and joins

This approach reduces complexity while maintaining all necessary functionality for recipe and meal management.
