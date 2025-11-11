# Design Document

## Overview

This design refactors the nutrition system to embed ingredients as simple text names within recipes using native PostgreSQL text arrays, eliminating the need for separate ingredient tables and join tables. Nutritional values are manually entered and stored directly on recipes and meals without automatic calculations. This dramatically simplifies the data model.

### Key Design Decisions

1. **Simple Text Array**: Store ingredients as a native PostgreSQL text array (TEXT[]) containing ingredient names only
2. **Manual Nutrition Entry**: Nutritional values are manually entered by coaches, not calculated
3. **Remove Join Tables**: Eliminate recipe_ingredients and meal_ingredients tables entirely
4. **Remove Calculations Module**: No automatic nutritional calculations needed
5. **Meals Contain Only Recipes**: Simplify meals to only contain recipes, removing direct ingredient associations
6. **Backward Migration**: Provide data migration to convert existing ingredient names to embedded text array format

## Architecture

### Current Architecture (Before)

```
Business
  ├── Ingredients (separate table)
  ├── Recipes
  │     └── RecipeIngredients (join table) → Ingredients
  └── Meals
        ├── MealRecipes (join table) → Recipes
        └── MealIngredients (join table) → Ingredients
```

### New Architecture (After)

```
Business
  ├── Recipes
  │     └── ingredients: [embedded JSONB array]
  └── Meals
        └── MealRecipes (join table) → Recipes
```

### Data Flow

1. **Recipe Creation**: Coach provides recipe details + ingredients list → System validates and stores recipe with embedded ingredients
2. **Meal Creation**: Coach adds recipes to meal → System calculates nutrition from recipe totals
3. **Nutrition Calculation**: System aggregates embedded ingredient nutrition → Stores totals in recipe → Aggregates recipe totals for meals

## Components and Interfaces

### 1. Recipe Schema (Modified)

**File**: `lib/easy/nutrition/recipe.ex`

**Changes**:
- Add `ingredients` field as `{:array, :string}` type (stored as JSONB array of strings)
- Remove `has_many :recipe_ingredients` association
- Remove `has_many :ingredients, through: [:recipe_ingredients, :ingredient]` association
- Update changesets to handle embedded ingredients validation

**Embedded Ingredient Structure**:
```elixir
# Simple array of ingredient names
["Chicken Breast", "Olive Oil", "Garlic", "Salt", "Pepper"]
```

### 2. Meal Schema (Modified)

**File**: `lib/easy/nutrition/meal.ex`

**Changes**:
- Remove `has_many :meal_ingredients` association
- Remove `has_many :ingredients, through: [:meal_ingredients, :ingredient]` association
- Keep `has_many :meal_recipes` and `has_many :recipes, through: [:meal_recipes, :recipe]` associations

### 3. Nutrition Context (Modified)

**File**: `lib/easy/nutrition.ex`

**Functions to Remove**:
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
- `validate_ingredient_in_business/2`
- `ingredient_in_use?/1` (private)

**Functions to Modify**:
- `create_recipe/3` - Accept ingredients list (array of strings) in attrs
- `update_recipe/3` - Allow updating ingredients list
- `get_recipe/2` - Remove ingredient preload options

**Functions to Remove**:
- `calculate_meal_nutrition/1` - No automatic calculations needed
- All calculation-related private functions

**Functions to Keep**:
- All meal management functions (create_meal, get_meal, list_meals, update_meal, delete_meal)
- All meal-recipe association functions (add_recipe_to_meal, remove_recipe_from_meal, update_meal_recipe)
- Recipe CRUD functions (modified as above)
- Validation helpers for coach and business

### 4. Calculations Module (Remove)

**File**: `lib/easy/nutrition/calculations.ex`

**Action**: Remove this entire module as automatic nutritional calculations are no longer needed. Nutritional values are manually entered by coaches.

### 5. Ingredient Validation (In Recipe Schema)

**File**: `lib/easy/nutrition/recipe.ex`

**Validation Logic**:
- Validate ingredients is a list
- Validate each ingredient is a non-empty string
- Validate each ingredient name is max 255 characters
- Trim whitespace from ingredient names

**Implementation**:
```elixir
defp validate_ingredients(changeset) do
  case get_change(changeset, :ingredients) do
    nil -> changeset
    ingredients when is_list(ingredients) ->
      # Validate and clean ingredient names
      cleaned = Enum.map(ingredients, &String.trim/1)
      errors = Enum.filter(cleaned, fn name -> 
        String.length(name) == 0 || String.length(name) > 255 
      end)
      
      if Enum.empty?(errors) do
        put_change(changeset, :ingredients, cleaned)
      else
        add_error(changeset, :ingredients, "must contain valid ingredient names")
      end
    _ ->
      add_error(changeset, :ingredients, "must be a list of strings")
  end
end
```

## Data Models

### Recipe Table (Modified)

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  created_by_id UUID NOT NULL REFERENCES coaches(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  prep_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  
  -- NEW: Embedded ingredients as native PostgreSQL text array
  ingredients TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Manually entered nutritional totals (not calculated)
  total_calories DECIMAL(10,2),
  total_protein DECIMAL(10,2),
  total_carbohydrates DECIMAL(10,2),
  total_fats DECIMAL(10,2),
  total_fiber DECIMAL(10,2),
  
  status VARCHAR(50) DEFAULT 'active',
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Index for searching ingredients within recipes using GIN
CREATE INDEX recipes_ingredients_gin_idx ON recipes USING GIN (ingredients);
```

### Tables to Remove

1. **ingredients** table - No longer needed
2. **recipe_ingredients** table - No longer needed
3. **meal_ingredients** table - No longer needed

### Meal Table (Unchanged)

The meals table structure remains the same, only the associations change.

## Error Handling

### Validation Errors

**Embedded Ingredient Validation**:
- Empty ingredient name → Return "ingredients must contain non-empty strings"
- Ingredient name too long (> 255 chars) → Return "ingredient names must be 255 characters or less"
- Invalid ingredients format → Return "ingredients must be a list of strings"

**Recipe Validation**:
- Empty ingredients list → Allow (recipe can have no ingredients initially)
- Nutritional values validation → Same as before (non-negative decimals)

### Migration Errors

- If recipe_ingredients reference missing ingredients → Use placeholder name "Unknown Ingredient"
- If data conversion fails → Rollback migration and report error
- If JSONB column creation fails → Rollback migration

## Testing Strategy

### Unit Tests

1. **Recipe Schema Tests** (`test/easy/nutrition/recipe_test.exs`)
   - Test create_changeset with embedded ingredients (array of strings)
   - Test update_changeset with ingredients modifications
   - Test validation of embedded ingredients (non-empty strings, max length)
   - Test empty ingredients list handling
   - Test whitespace trimming from ingredient names
   - Test duplicate ingredient names are allowed

### Integration Tests

1. **Nutrition Context Tests** (`test/easy/nutrition_test.exs`)
   - Test creating recipe with embedded ingredients (array of strings)
   - Test updating recipe ingredients
   - Test manually entering nutritional values for recipes
   - Test manually entering nutritional values for meals
   - Test recipe duplication with embedded ingredients
   - Test business context isolation

2. **Migration Tests** (`test/priv/repo/migrations/migrate_ingredients_test.exs`)
   - Test migration converts recipe_ingredients to embedded ingredient names
   - Test migration preserves ingredient names
   - Test migration handles missing ingredients gracefully
   - Test rollback functionality

### API Tests

1. **Recipe Controller Tests** (`test/easy_web/controllers/recipe_controller_test.exs`)
   - Test creating recipe with ingredients array via API
   - Test updating recipe ingredients via API
   - Test manually entering nutritional values via API
   - Test retrieving recipe with embedded ingredients
   - Test validation errors are returned properly

2. **Meal Controller Tests** (`test/easy_web/controllers/meal_controller_test.exs`)
   - Test creating meal with recipes (no direct ingredients)
   - Test manually entering meal nutritional values via API
   - Test that meal_ingredient endpoints are removed

## Migration Strategy

### Phase 1: Add Text Array Column

```elixir
defmodule Easy.Repo.Migrations.AddIngredientsToRecipes do
  use Ecto.Migration

  def change do
    alter table(:recipes) do
      add :ingredients, {:array, :string}, default: []
    end

    create index(:recipes, [:ingredients], using: :gin)
  end
end
```

### Phase 2: Migrate Data

```elixir
defmodule Easy.Repo.Migrations.MigrateIngredientsToEmbedded do
  use Ecto.Migration
  import Ecto.Query

  def up do
    # Migrate recipe_ingredients to embedded ingredient names as text array
    execute """
    UPDATE recipes r
    SET ingredients = (
      SELECT ARRAY_AGG(i.name)
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = r.id
    )
    WHERE EXISTS (
      SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
    )
    """
    
    # Handle recipes with no ingredients (set to empty array)
    execute """
    UPDATE recipes r
    SET ingredients = ARRAY[]::TEXT[]
    WHERE ingredients IS NULL
    """
  end

  def down do
    # Rollback not supported - would require recreating tables
    raise "Migration rollback not supported"
  end
end
```

### Phase 3: Remove Old Tables

```elixir
defmodule Easy.Repo.Migrations.RemoveIngredientTables do
  use Ecto.Migration

  def up do
    drop table(:meal_ingredients)
    drop table(:recipe_ingredients)
    drop table(:ingredients)
  end

  def down do
    # Rollback not supported
    raise "Migration rollback not supported"
  end
end
```

## API Changes

### Recipe Creation (Modified)

**Before**:
```elixir
# Create recipe
{:ok, recipe} = Nutrition.create_recipe(business_id, coach_id, %{
  name: "Grilled Chicken",
  servings: 4
})

# Add ingredients separately
Nutrition.add_ingredient_to_recipe(recipe.id, ingredient_id, Decimal.new("200"), "g")
```

**After**:
```elixir
# Create recipe with embedded ingredient names and manual nutrition values
{:ok, recipe} = Nutrition.create_recipe(business_id, coach_id, %{
  name: "Grilled Chicken",
  servings: 4,
  ingredients: ["Chicken Breast", "Olive Oil", "Garlic", "Salt", "Pepper"],
  total_calories: Decimal.new("350"),
  total_protein: Decimal.new("45"),
  total_carbohydrates: Decimal.new("5"),
  total_fats: Decimal.new("15"),
  total_fiber: Decimal.new("1")
})
```

### Meal Creation (Unchanged)

Meal creation remains the same - only recipes are added to meals:

```elixir
{:ok, meal} = Nutrition.create_meal(business_id, coach_id, %{
  name: "Lunch",
  meal_type: "lunch"
})

Nutrition.add_recipe_to_meal(meal.id, recipe.id, Decimal.new("1.0"))
```

### Removed Endpoints

- `Nutrition.create_ingredient/3`
- `Nutrition.update_ingredient/3`
- `Nutrition.delete_ingredient/2`
- `Nutrition.list_ingredients/2`
- `Nutrition.search_ingredients/2`
- `Nutrition.add_ingredient_to_recipe/5`
- `Nutrition.remove_ingredient_from_recipe/3`
- `Nutrition.update_recipe_ingredient/4`
- `Nutrition.add_ingredient_to_meal/5`
- `Nutrition.remove_ingredient_from_meal/3`
- `Nutrition.update_meal_ingredient/4`

## Performance Considerations

### Array Indexing

- Use GIN index on ingredients column for efficient searching within text arrays
- Query ingredients using PostgreSQL array operators: `@>`, `&&`, `ANY`

### Query Examples

```sql
-- Find recipes containing a specific ingredient name
SELECT * FROM recipes 
WHERE 'Chicken Breast' = ANY(ingredients);

-- Find recipes containing any of multiple ingredients
SELECT * FROM recipes 
WHERE ingredients && ARRAY['Chicken', 'Beef', 'Pork'];

-- Find recipes with a specific ingredient (case-insensitive)
SELECT * FROM recipes 
WHERE EXISTS (
  SELECT 1 FROM UNNEST(ingredients) AS ing
  WHERE LOWER(ing) LIKE '%chicken%'
);

-- Find recipes containing all specified ingredients
SELECT * FROM recipes 
WHERE ingredients @> ARRAY['Chicken', 'Garlic'];
```

### Manual Nutrition Entry

- Nutritional values are manually entered by coaches
- No automatic calculations or recalculations
- Coaches are responsible for accuracy of nutritional data

## Security Considerations

- Maintain business context isolation - recipes and meals remain scoped to business_id
- Validate coach permissions before allowing recipe/meal modifications
- Sanitize ingredient data to prevent JSONB injection attacks
- Limit ingredients array size to prevent DoS (e.g., max 100 ingredients per recipe)

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**: Revert code deployment to previous version
2. **Data Recovery**: If old tables were dropped, restore from backup
3. **Gradual Migration**: Consider keeping old tables temporarily and running dual-write mode
4. **Testing**: Ensure comprehensive testing in staging environment before production deployment
