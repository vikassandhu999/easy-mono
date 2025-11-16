# Nutrition System Design Document

## Overview

The Nutrition System is a comprehensive module for the Easy coaching platform that enables coaches to create and manage nutrition plans for their clients. The system provides a hierarchical structure where coaches build reusable ingredients and recipes, then compose them into meals within client-specific nutrition plans.

### Key Design Principles

1. **Simplicity**: Clear hierarchy with minimal abstraction layers
2. **Reusability**: Ingredients and recipes are reusable; meals are plan-specific
3. **Business Context**: All resources are scoped to business for data isolation
4. **Automatic Calculations**: Nutritional values calculated automatically at all levels
5. **Coach Permissions**: Strict validation of coach-client relationships

### System Hierarchy

```
Business
  └─ Ingredients (reusable)
  └─ Recipes (reusable)
       └─ Recipe Ingredients (quantities)
  └─ Meals (standalone, can be reusable or one-off)
       ├─ Meal Recipes (with serving multipliers)
       └─ Meal Ingredients (direct, with quantities)
```

**Note**: Nutrition Plans and Workout Plans will be designed together in a future phase to ensure consistency in how we handle plan structures across both domains.

## Architecture

### Module Structure

```
lib/easy/nutrition/
  ├── nutrition.ex                    # Public API context
  ├── ingredient.ex                   # Ingredient schema
  ├── recipe.ex                       # Recipe schema
  ├── recipe_ingredient.ex            # Recipe-Ingredient join schema
  ├── meal.ex                         # Meal schema
  ├── meal_recipe.ex                  # Meal-Recipe join schema
  ├── meal_ingredient.ex              # Meal-Ingredient join schema
  └── calculations.ex                 # Nutritional calculations helper

lib/easy_web/controllers/
  ├── ingredient_controller.ex
  ├── recipe_controller.ex
  └── meal_controller.ex
```

### Context Boundaries

The Nutrition context will interact with:
- **Easy.Organizations**: For business scoping
- **Easy.Organizations**: For coach validation and permissions
- **Easy.Clients**: For client assignment validation

## Data Models

### 1. Ingredient Schema

```elixir
defmodule Easy.Nutrition.Ingredient do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "ingredients" do
    field :name, :string
    field :description, :string
    
    # Nutritional values per 100g
    field :calories, :decimal          # kcal per 100g
    field :protein, :decimal           # grams per 100g
    field :carbohydrates, :decimal     # grams per 100g
    field :fats, :decimal              # grams per 100g
    field :fiber, :decimal             # grams per 100g
    
    # Metadata
    field :source, :string             # e.g., "USDA", "custom"
    field :status, :string, default: "active"
    
    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Organizations.Coach
    
    # Relationships
    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient
    has_many :meal_ingredients, Easy.Nutrition.MealIngredient
    
    timestamps()
  end
end
```

**Validations:**
- Name: required, min 1 char, max 255 chars
- Nutritional values: non-negative decimals
- Business: required foreign key
- Status: one of ["active", "archived"]

### 2. Recipe Schema

```elixir
defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :prep_time_minutes, :integer
    field :servings, :integer, default: 1
    
    # Cached nutritional totals (calculated from ingredients)
    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbohydrates, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal
    
    field :status, :string, default: "active"
    
    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Organizations.Coach
    
    # Relationships
    has_many :recipe_ingredients, Easy.Nutrition.RecipeIngredient
    has_many :ingredients, through: [:recipe_ingredients, :ingredient]
    has_many :meal_recipes, Easy.Nutrition.MealRecipe
    
    timestamps()
  end
end
```

**Validations:**
- Name: required, min 1 char, max 255 chars
- Servings: positive integer
- Business: required foreign key
- Status: one of ["active", "archived"]

### 3. Recipe Ingredient Schema (Join Table)

```elixir
defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "recipe_ingredients" do
    field :quantity, :decimal          # Amount of ingredient
    field :unit, :string               # g, kg, ml, l, cup, tbsp, etc.
    field :notes, :string              # Optional notes (e.g., "chopped", "diced")
    
    belongs_to :recipe, Easy.Nutrition.Recipe
    belongs_to :ingredient, Easy.Nutrition.Ingredient
    
    timestamps()
  end
end
```

**Validations:**
- Quantity: required, positive decimal
- Unit: required, one of predefined units
- Recipe and Ingredient: required foreign keys

### 4. Meal Schema

```elixir
defmodule Easy.Nutrition.Meal do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "meals" do
    field :name, :string
    field :description, :string
    field :meal_type, :string          # breakfast, lunch, dinner, snack
    field :notes, :string
    field :status, :string, default: "active"
    
    # Cached nutritional totals (calculated from recipes + ingredients)
    field :total_calories, :decimal
    field :total_protein, :decimal
    field :total_carbohydrates, :decimal
    field :total_fats, :decimal
    field :total_fiber, :decimal
    
    belongs_to :business, Easy.Organizations.Business
    belongs_to :created_by, Easy.Organizations.Coach
    
    # Relationships
    has_many :meal_recipes, Easy.Nutrition.MealRecipe
    has_many :recipes, through: [:meal_recipes, :recipe]
    has_many :meal_ingredients, Easy.Nutrition.MealIngredient
    has_many :ingredients, through: [:meal_ingredients, :ingredient]
    
    timestamps()
  end
end
```

**Validations:**
- Name: required, min 1 char, max 255 chars
- Meal type: required, one of ["breakfast", "lunch", "dinner", "snack"]
- Business: required foreign key
- Status: one of ["active", "archived"]

**Note**: Meals are now standalone entities that can be reused by coaches. They are scoped to the business context and can be added to future nutrition plans.

### 5. Meal Recipe Schema (Join Table)

```elixir
defmodule Easy.Nutrition.MealRecipe do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "meal_recipes" do
    field :servings, :decimal, default: 1.0  # Serving multiplier
    field :notes, :string
    
    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :recipe, Easy.Nutrition.Recipe
    
    timestamps()
  end
end
```

**Validations:**
- Servings: required, positive decimal
- Meal and Recipe: required foreign keys

### 6. Meal Ingredient Schema (Join Table)

```elixir
defmodule Easy.Nutrition.MealIngredient do
  use Ecto.Schema
  
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  
  schema "meal_ingredients" do
    field :quantity, :decimal
    field :unit, :string
    field :notes, :string
    
    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :ingredient, Easy.Nutrition.Ingredient
    
    timestamps()
  end
end
```

**Validations:**
- Quantity: required, positive decimal
- Unit: required, one of predefined units
- Meal and Ingredient: required foreign keys

## Database Schema

### Tables and Indexes

```sql
-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  created_by_id UUID NOT NULL REFERENCES coaches(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  calories DECIMAL(10,2) NOT NULL DEFAULT 0,
  protein DECIMAL(10,2) NOT NULL DEFAULT 0,
  carbohydrates DECIMAL(10,2) NOT NULL DEFAULT 0,
  fats DECIMAL(10,2) NOT NULL DEFAULT 0,
  fiber DECIMAL(10,2) NOT NULL DEFAULT 0,
  source VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX ingredients_business_id_index ON ingredients(business_id);
CREATE INDEX ingredients_status_index ON ingredients(status);
CREATE INDEX ingredients_name_index ON ingredients(name);

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  created_by_id UUID NOT NULL REFERENCES coaches(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  prep_time_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 1,
  total_calories DECIMAL(10,2),
  total_protein DECIMAL(10,2),
  total_carbohydrates DECIMAL(10,2),
  total_fats DECIMAL(10,2),
  total_fiber DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX recipes_business_id_index ON recipes(business_id);
CREATE INDEX recipes_status_index ON recipes(status);
CREATE INDEX recipes_name_index ON recipes(name);

-- Recipe Ingredients join table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  notes TEXT,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX recipe_ingredients_recipe_id_index ON recipe_ingredients(recipe_id);
CREATE INDEX recipe_ingredients_ingredient_id_index ON recipe_ingredients(ingredient_id);
CREATE UNIQUE INDEX recipe_ingredients_recipe_ingredient_index 
  ON recipe_ingredients(recipe_id, ingredient_id);

-- Meals table
CREATE TABLE meals (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id),
  created_by_id UUID NOT NULL REFERENCES coaches(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meal_type VARCHAR(20) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  total_calories DECIMAL(10,2),
  total_protein DECIMAL(10,2),
  total_carbohydrates DECIMAL(10,2),
  total_fats DECIMAL(10,2),
  total_fiber DECIMAL(10,2),
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX meals_business_id_index ON meals(business_id);
CREATE INDEX meals_status_index ON meals(status);
CREATE INDEX meals_meal_type_index ON meals(meal_type);
CREATE INDEX meals_name_index ON meals(name);

-- Meal Recipes join table
CREATE TABLE meal_recipes (
  id UUID PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  servings DECIMAL(10,2) NOT NULL DEFAULT 1.0,
  notes TEXT,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX meal_recipes_meal_id_index ON meal_recipes(meal_id);
CREATE INDEX meal_recipes_recipe_id_index ON meal_recipes(recipe_id);
CREATE UNIQUE INDEX meal_recipes_meal_recipe_index 
  ON meal_recipes(meal_id, recipe_id);

-- Meal Ingredients join table
CREATE TABLE meal_ingredients (
  id UUID PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  notes TEXT,
  inserted_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX meal_ingredients_meal_id_index ON meal_ingredients(meal_id);
CREATE INDEX meal_ingredients_ingredient_id_index ON meal_ingredients(ingredient_id);
```

## Components and Interfaces

### Public API (Easy.Nutrition Context)

```elixir
defmodule Easy.Nutrition do
  # Ingredient Management
  def create_ingredient(business_id, coach_id, attrs)
  def get_ingredient(id)
  def list_ingredients(business_id, opts \\ [])
  def update_ingredient(ingredient, attrs)
  def delete_ingredient(ingredient)
  def search_ingredients(business_id, query)
  
  # Recipe Management
  def create_recipe(business_id, coach_id, attrs)
  def get_recipe(id, preload \\ [])
  def list_recipes(business_id, opts \\ [])
  def update_recipe(recipe, attrs)
  def delete_recipe(recipe)
  def add_ingredient_to_recipe(recipe_id, ingredient_id, quantity, unit)
  def remove_ingredient_from_recipe(recipe_id, ingredient_id)
  def update_recipe_ingredient(recipe_id, ingredient_id, attrs)
  def calculate_recipe_nutrition(recipe_id)
  
  # Meal Management
  def create_meal(business_id, coach_id, attrs)
  def get_meal(id, preload \\ [])
  def list_meals(business_id, opts \\ [])
  def update_meal(meal, attrs)
  def delete_meal(meal)
  def add_recipe_to_meal(meal_id, recipe_id, servings)
  def add_ingredient_to_meal(meal_id, ingredient_id, quantity, unit)
  def remove_recipe_from_meal(meal_id, recipe_id)
  def remove_ingredient_from_meal(meal_id, ingredient_id)
  def update_meal_recipe(meal_id, recipe_id, attrs)
  def update_meal_ingredient(meal_id, ingredient_id, attrs)
  def calculate_meal_nutrition(meal_id)
  def duplicate_meal(meal_id, new_name)
end
```

### Nutritional Calculations Module

```elixir
defmodule Easy.Nutrition.Calculations do
  @doc """
  Calculates nutritional values for an ingredient based on quantity.
  Ingredient values are per 100g, so we scale proportionally.
  """
  def calculate_ingredient_nutrition(ingredient, quantity_grams) do
    multiplier = Decimal.div(quantity_grams, 100)
    
    %{
      calories: Decimal.mult(ingredient.calories, multiplier),
      protein: Decimal.mult(ingredient.protein, multiplier),
      carbohydrates: Decimal.mult(ingredient.carbohydrates, multiplier),
      fats: Decimal.mult(ingredient.fats, multiplier),
      fiber: Decimal.mult(ingredient.fiber, multiplier)
    }
  end
  
  @doc """
  Calculates total nutritional values for a recipe from its ingredients.
  """
  def calculate_recipe_nutrition(recipe) do
    recipe.recipe_ingredients
    |> Enum.map(fn ri ->
      quantity_grams = convert_to_grams(ri.quantity, ri.unit)
      calculate_ingredient_nutrition(ri.ingredient, quantity_grams)
    end)
    |> sum_nutritional_values()
  end
  
  @doc """
  Calculates total nutritional values for a meal from recipes and ingredients.
  """
  def calculate_meal_nutrition(meal) do
    recipe_nutrition = calculate_meal_recipes_nutrition(meal.meal_recipes)
    ingredient_nutrition = calculate_meal_ingredients_nutrition(meal.meal_ingredients)
    
    sum_nutritional_values([recipe_nutrition, ingredient_nutrition])
  end
  
  @doc """
  Converts various units to grams for standardized calculations.
  """
  def convert_to_grams(quantity, unit) do
    # Implementation for unit conversions
    # g -> g (1:1)
    # kg -> g (1000:1)
    # ml -> g (assume 1:1 for liquids)
    # cup -> g (240:1)
    # tbsp -> g (15:1)
    # etc.
  end
  
  defp sum_nutritional_values(nutrition_list) do
    Enum.reduce(nutrition_list, %{
      calories: Decimal.new(0),
      protein: Decimal.new(0),
      carbohydrates: Decimal.new(0),
      fats: Decimal.new(0),
      fiber: Decimal.new(0)
    }, fn nutrition, acc ->
      %{
        calories: Decimal.add(acc.calories, nutrition.calories),
        protein: Decimal.add(acc.protein, nutrition.protein),
        carbohydrates: Decimal.add(acc.carbohydrates, nutrition.carbohydrates),
        fats: Decimal.add(acc.fats, nutrition.fats),
        fiber: Decimal.add(acc.fiber, nutrition.fiber)
      }
    end)
  end
end
```

## Error Handling

### Validation Errors

All changesets will provide clear error messages:

```elixir
{:error, changeset} = Nutrition.create_ingredient(business_id, coach_id, %{name: ""})
# changeset.errors => [name: {"can't be blank", [validation: :required]}]
```

### Permission Errors

```elixir
# Coach trying to access ingredient from different business
{:error, :unauthorized} = Nutrition.get_ingredient(other_business_ingredient_id)

# Coach trying to create plan for client not in their business
{:error, :unauthorized} = Nutrition.create_nutrition_plan(business_id, other_client_id, coach_id, attrs)
```

### Business Logic Errors

```elixir
# Trying to delete ingredient used in active recipes
{:error, :ingredient_in_use} = Nutrition.delete_ingredient(ingredient)

# Trying to activate plan when client already has active plan
{:error, :client_has_active_plan} = Nutrition.activate_nutrition_plan(plan)
```

## Testing Strategy

### Unit Tests

1. **Schema Tests**
   - Validate all changeset validations
   - Test default values
   - Test associations

2. **Calculation Tests**
   - Test ingredient nutrition calculations with various quantities
   - Test recipe nutrition aggregation
   - Test meal nutrition aggregation
   - Test unit conversions

3. **Context Function Tests**
   - Test CRUD operations for all entities
   - Test business scoping
   - Test permission validations

### Integration Tests

1. **End-to-End Workflows**
   - Create ingredient → Create recipe → Create meal → Calculate nutrition
   - Create nutrition plan → Add meals → Activate plan
   - Update recipe → Verify meal calculations remain unchanged

2. **Permission Tests**
   - Cross-business access prevention
   - Coach-client relationship validation
   - Business context enforcement

### Test Data Fixtures

```elixir
# test/support/fixtures/nutrition_fixtures.ex
defmodule Easy.NutritionFixtures do
  def ingredient_fixture(business_id, coach_id, attrs \\ %{}) do
    # Create test ingredient
  end
  
  def recipe_fixture(business_id, coach_id, attrs \\ %{}) do
    # Create test recipe with ingredients
  end
  
  def nutrition_plan_fixture(business_id, client_id, coach_id, attrs \\ %{}) do
    # Create test nutrition plan
  end
  
  def meal_fixture(nutrition_plan_id, attrs \\ %{}) do
    # Create test meal
  end
end
```

## Performance Considerations

### Caching Strategy

1. **Recipe Nutrition Totals**: Cached in `recipes.total_*` fields, recalculated on ingredient changes
2. **Meal Nutrition Totals**: Cached in `meals.total_*` fields, calculated once at meal creation
3. **Daily Summaries**: Calculated on-demand, could be cached for completed days

### Query Optimization

1. **Preloading**: Use `Repo.preload` for associations to avoid N+1 queries
2. **Indexes**: All foreign keys and frequently queried fields are indexed
3. **Pagination**: Implement cursor-based pagination for large lists

### Database Considerations

1. **Cascade Deletes**: Meals cascade delete when nutrition plan is deleted
2. **Soft Deletes**: Consider soft deletes for ingredients/recipes (status: "archived")
3. **Decimal Precision**: Use DECIMAL(10,2) for nutritional values (sufficient for most use cases)

## Security Considerations

### Business Context Isolation

All queries must filter by business_id to prevent cross-business data access:

```elixir
def list_ingredients(business_id, opts) do
  from(i in Ingredient,
    where: i.business_id == ^business_id,
    where: i.status == "active"
  )
  |> Repo.all()
end
```

### Coach-Client Validation

Before creating nutrition plans, validate coach-client relationship:

```elixir
def create_nutrition_plan(business_id, client_id, coach_id, attrs) do
  with {:ok, coach} <- validate_coach_in_business(coach_id, business_id),
       {:ok, client} <- validate_client_in_business(client_id, business_id),
       {:ok, _assignment} <- validate_coach_client_assignment(coach_id, client_id) do
    # Create plan
  end
end
```

### Input Sanitization

- All text inputs sanitized to prevent XSS
- Decimal values validated for reasonable ranges
- Unit values validated against whitelist

## Migration Strategy

### Phase 1: Core Tables
1. Create ingredients table
2. Create recipes table
3. Create recipe_ingredients join table

### Phase 2: Meals
4. Create meals table
5. Create meal_recipes join table
6. Create meal_ingredients join table

### Phase 3: Indexes and Constraints
7. Add all indexes
8. Add foreign key constraints
9. Add unique constraints

**Note**: Nutrition Plans will be added in a future phase alongside Workout Plans to ensure consistent plan architecture.

## Future Enhancements

### Potential Features (Not in MVP)

1. **Meal Duplication**: Allow coaches to duplicate meals across plans
2. **Recipe Sharing**: Share recipes across businesses (marketplace)
3. **Ingredient Database**: Integration with USDA or other nutrition databases
4. **Meal Photos**: Allow clients to upload photos of meals
5. **Nutrition Tracking**: Allow clients to log actual consumption vs planned
6. **Shopping Lists**: Generate shopping lists from nutrition plans
7. **Meal Prep Instructions**: Add prep day and batch cooking support
8. **Allergen Tracking**: Tag ingredients with common allergens
9. **Dietary Preferences**: Filter recipes by dietary restrictions (vegan, keto, etc.)
10. **Recipe Ratings**: Allow coaches to rate and favorite recipes

## API Endpoints (Future)

```
# Ingredients
GET    /api/businesses/:business_id/ingredients
POST   /api/businesses/:business_id/ingredients
GET    /api/ingredients/:id
PATCH  /api/ingredients/:id
DELETE /api/ingredients/:id

# Recipes
GET    /api/businesses/:business_id/recipes
POST   /api/businesses/:business_id/recipes
GET    /api/recipes/:id
PATCH  /api/recipes/:id
DELETE /api/recipes/:id
POST   /api/recipes/:id/ingredients
PATCH  /api/recipes/:id/ingredients/:ingredient_id
DELETE /api/recipes/:id/ingredients/:ingredient_id

# Meals
GET    /api/businesses/:business_id/meals
POST   /api/businesses/:business_id/meals
GET    /api/meals/:id
PATCH  /api/meals/:id
DELETE /api/meals/:id
POST   /api/meals/:id/duplicate
POST   /api/meals/:id/recipes
POST   /api/meals/:id/ingredients
PATCH  /api/meals/:id/recipes/:recipe_id
PATCH  /api/meals/:id/ingredients/:ingredient_id
DELETE /api/meals/:id/recipes/:recipe_id
DELETE /api/meals/:id/ingredients/:ingredient_id
```
