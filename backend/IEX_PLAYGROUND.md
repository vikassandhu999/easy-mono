# IEx Playground with Phoenix Server

A comprehensive guide to running and interacting with your Phoenix application using IEx (Interactive Elixir).

## Starting the Server with IEx

### Option 1: Standard IEx with Phoenix Server

```bash
cd easy-backend
iex -S mix phx.server
```

This starts the Phoenix server AND gives you an interactive Elixir shell.

### Option 2: IEx Without Starting the Server

```bash
cd easy-backend
iex -S mix
```

This loads your application without starting the web server (useful for scripts/testing).

## Useful IEx Commands

### Basic Commands

```elixir
# Get help
h()

# Help for a specific module
h Easy.Nutrition.Recipe

# Help for a specific function
h Easy.Nutrition.Recipe.create_changeset

# List all functions in a module
exports Easy.Nutrition.Recipe

# Recompile a specific module
r Easy.Nutrition.Recipe

# Recompile all changed modules
recompile()

# Clear the console
clear()

# Exit IEx
Ctrl+C twice or exit()
```

## Working with Recipes

### Create a Recipe

```elixir
# Get your business and coach IDs first
alias Easy.Repo
alias Easy.Nutrition.Recipe

# Example: Create a recipe
attrs = %{
  business_id: "YOUR_BUSINESS_ID",
  created_by_id: "YOUR_COACH_ID",
  name: "Grilled Salmon with Lemon-Dill",
  description: "Fresh grilled salmon served with zesty lemon and dill sauce",
  prep_time_minutes: 25,
  servings: 2,
  ingredients: [
    %{name: "Salmon fillet", quantity: 400, unit: "g"},
    %{name: "Lemon", quantity: 1, unit: "piece"},
    %{name: "Fresh dill", quantity: 2, unit: "tbsp"}
  ],
  total_calories: 450,
  total_protein: 42,
  total_carbohydrates: 8,
  total_fats: 28,
  total_fiber: 2,
  status: "active"
}

# Create the recipe
{:ok, recipe} = %Recipe{}
  |> Recipe.create_changeset(attrs)
  |> Repo.insert()

# View the created recipe
recipe
```

### List All Recipes

```elixir
import Ecto.Query

# Get all recipes
Recipe |> Repo.all()

# Get all active recipes
Recipe
|> where([r], r.status == "active")
|> Repo.all()

# Get recipes with preloaded associations
Recipe
|> preload(:business)
|> preload(:created_by)
|> Repo.all()
```

### Find a Specific Recipe

```elixir
# By ID
recipe = Repo.get(Recipe, "recipe-uuid-here")

# By name
recipe = Repo.get_by(Recipe, name: "Grilled Salmon with Lemon-Dill")

# First recipe
recipe = Recipe |> first() |> Repo.one()
```

### Update a Recipe

```elixir
# Get recipe
recipe = Repo.get(Recipe, "recipe-uuid-here")

# Update it
attrs = %{
  description: "Updated description",
  total_calories: 500
}

{:ok, updated_recipe} = recipe
  |> Recipe.update_changeset(attrs)
  |> Repo.update()
```

### Delete a Recipe

```elixir
recipe = Repo.get(Recipe, "recipe-uuid-here")
Repo.delete(recipe)
```

## Working with Ingredients

### Add Ingredients to Existing Recipe

```elixir
recipe = Repo.get(Recipe, "recipe-uuid-here")

new_ingredients = [
  %{name: "Salt", quantity: 1, unit: "tsp"},
  %{name: "Pepper", quantity: 0.5, unit: "tsp"}
]

attrs = %{ingredients: recipe.ingredients ++ new_ingredients}

{:ok, updated_recipe} = recipe
  |> Recipe.update_changeset(attrs)
  |> Repo.update()
```

### Update Specific Ingredient

```elixir
recipe = Repo.get(Recipe, "recipe-uuid-here")

# Update first ingredient's quantity
updated_ingredients = recipe.ingredients
  |> Enum.with_index()
  |> Enum.map(fn {ing, idx} ->
    if idx == 0 do
      %{ing | "quantity" => 500}  # Change salmon to 500g
    else
      ing
    end
  end)

attrs = %{ingredients: updated_ingredients}

{:ok, updated_recipe} = recipe
  |> Recipe.update_changeset(attrs)
  |> Repo.update()
```

## Database Queries

### Complex Queries

```elixir
import Ecto.Query

# Recipes with high protein
high_protein_recipes = Recipe
  |> where([r], r.total_protein > 30)
  |> order_by([r], desc: r.total_protein)
  |> Repo.all()

# Recipes by prep time
quick_recipes = Recipe
  |> where([r], r.prep_time_minutes <= 20)
  |> order_by([r], asc: r.prep_time_minutes)
  |> Repo.all()

# Count recipes
Recipe |> select([r], count(r.id)) |> Repo.one()

# Get recipe names only
Recipe |> select([r], r.name) |> Repo.all()
```

### Aggregations

```elixir
# Average calories
Recipe
  |> select([r], avg(r.total_calories))
  |> Repo.one()

# Max protein
Recipe
  |> select([r], max(r.total_protein))
  |> Repo.one()

# Group by servings
Recipe
  |> group_by([r], r.servings)
  |> select([r], {r.servings, count(r.id)})
  |> Repo.all()
```

## Testing API Endpoints

### Using HTTPoison in IEx

```elixir
# First, get a token (you'll need valid credentials)
# Then make requests:

url = "http://localhost:4000/api/recipes"
headers = [{"Authorization", "Bearer YOUR_TOKEN"}, {"Content-Type", "application/json"}]

# GET all recipes
{:ok, response} = HTTPoison.get(url, headers)
Jason.decode!(response.body)

# POST new recipe
body = Jason.encode!(%{
  name: "Test Recipe",
  description: "Test description",
  status: "active"
})

{:ok, response} = HTTPoison.post(url, body, headers)
Jason.decode!(response.body)
```

## Useful Aliases

Add these to `~/.iex.exs` for convenience:

```elixir
# Create ~/.iex.exs file with:
alias Easy.Repo
alias Easy.Nutrition.{Recipe, Meal}
alias Easy.Organizations.Business
alias Easy.Coaches.Coach
alias Easy.Clients.Client
import Ecto.Query

# Helper to pretty print
defmodule H do
  def pp(data), do: IO.inspect(data, pretty: true, limit: :infinity)
end
```

Then in IEx:

```elixir
# Pretty print
Recipe |> Repo.all() |> H.pp()
```

## Debugging

### Inspect Changesets

```elixir
changeset = %Recipe{}
  |> Recipe.create_changeset(%{name: ""})

# See errors
changeset.errors

# Check if valid
changeset.valid?

# Apply changeset
Ecto.Changeset.apply_changes(changeset)
```

### Database Connection

```elixir
# Check if connected
Repo.__adapter__().checked_out?(Repo)

# Run raw SQL
Repo.query("SELECT * FROM recipes LIMIT 1")

# Explain query
Recipe
|> limit(1)
|> Repo.explain()
```

## Seeding Data

### Quick Seed Script

```elixir
# Run this in IEx to create test recipes
defmodule Seeder do
  def create_test_recipes(business_id, coach_id) do
    recipes = [
      %{
        name: "Grilled Salmon",
        description: "Fresh salmon with herbs",
        prep_time_minutes: 25,
        servings: 2,
        ingredients: [
          %{name: "Salmon", quantity: 400, unit: "g"},
          %{name: "Lemon", quantity: 1, unit: "piece"}
        ],
        total_calories: 450,
        total_protein: 42,
        status: "active"
      },
      %{
        name: "Chicken Salad",
        description: "Healthy chicken salad",
        prep_time_minutes: 15,
        servings: 1,
        ingredients: [
          %{name: "Chicken breast", quantity: 200, unit: "g"},
          %{name: "Mixed greens", quantity: 100, unit: "g"}
        ],
        total_calories: 300,
        total_protein: 35,
        status: "active"
      }
    ]
    
    Enum.each(recipes, fn recipe_attrs ->
      attrs = Map.merge(recipe_attrs, %{
        business_id: business_id,
        created_by_id: coach_id
      })
      
      %Recipe{}
      |> Recipe.create_changeset(attrs)
      |> Repo.insert!()
    end)
    
    IO.puts("✅ Created #{length(recipes)} test recipes")
  end
end

# Run it
Seeder.create_test_recipes("your-business-id", "your-coach-id")
```

## Environment Variables

```elixir
# Check environment
Mix.env()

# Get config values
Application.get_env(:easy, Easy.Repo)
Application.get_env(:easy, EasyWeb.Endpoint)
```

## Tips & Tricks

### 1. Auto-complete
Press `Tab` to auto-complete module/function names

### 2. Multi-line Input
IEx automatically continues when you have unclosed brackets/quotes

### 3. Previous Commands
- `Ctrl+P` - Previous command
- `Ctrl+N` - Next command
- `v(n)` - Get value from history (e.g., `v(1)` gets first result)

### 4. Break Long Operations
Press `Ctrl+C` once to interrupt, twice to exit

### 5. Search History
`Ctrl+R` then type to search command history

## Common Workflows

### 1. Test Recipe Creation Flow

```elixir
# 1. Create attrs
attrs = %{
  business_id: "...",
  created_by_id: "...",
  name: "Test Recipe",
  ingredients: [%{name: "Item", quantity: 1, unit: "piece"}]
}

# 2. Build changeset
changeset = %Recipe{} |> Recipe.create_changeset(attrs)

# 3. Check if valid
changeset.valid?

# 4. See errors if any
changeset.errors

# 5. Insert
{:ok, recipe} = Repo.insert(changeset)
```

### 2. Batch Update Recipes

```elixir
# Update all recipes to add default nutritional info
Recipe
|> Repo.all()
|> Enum.each(fn recipe ->
  if is_nil(recipe.total_calories) do
    recipe
    |> Recipe.update_changeset(%{
      total_calories: 0,
      total_protein: 0,
      total_carbohydrates: 0,
      total_fats: 0
    })
    |> Repo.update()
  end
end)
```

### 3. Data Migration Test

```elixir
# Test ingredient format conversion
old_format = ["Salmon", "Lemon", "Dill"]

new_format = Enum.map(old_format, fn name ->
  %{name: name, quantity: 0, unit: ""}
end)

IO.inspect(new_format)
```

## Troubleshooting

### Server Won't Start
```elixir
# Check port 4000 is available
System.cmd("lsof", ["-i", ":4000"])

# Or use different port
# In config/dev.exs change port to 4001
```

### Module Not Found
```elixir
# Recompile
recompile()

# Or restart IEx
```

### Database Connection Issues
```elixir
# Test connection
Repo.query("SELECT 1")

# Check config
Application.get_env(:easy, Easy.Repo)
```

## Resources

- [IEx Documentation](https://hexdocs.pm/iex/IEx.html)
- [Ecto Query Documentation](https://hexdocs.pm/ecto/Ecto.Query.html)
- [Phoenix IEx Guide](https://hexdocs.pm/phoenix/1.7.0/phoenix_mix_tasks.html#iex-s-mix-phx-server)

---

Happy coding! 🚀