# Test Recipes Script
# Run this in IEx with: `iex -S mix` then `Code.eval_file("test_recipes.exs")`
# Or from terminal: `cd easy-backend && mix run test_recipes.exs`

IO.puts("\n🧪 Recipe Testing Script\n")

alias Easy.Repo
alias Easy.Nutrition.Recipe
alias Easy.Organizations.Business
alias Easy.Coaches.Coach
import Ecto.Query

# Helper functions
defmodule TestHelper do
  def get_or_create_test_business do
    case Easy.Repo.get_by(Easy.Organizations.Business, name: "Test Business") do
      nil ->
        IO.puts("Creating test business...")

        {:ok, business} =
          Easy.Repo.insert(%Easy.Organizations.Business{
            name: "Test Business",
            email: "test@business.com",
            subscription_status: "active"
          })

        business

      business ->
        IO.puts("Using existing test business: #{business.name}")
        business
    end
  end

  def get_or_create_test_coach(business_id) do
    case Easy.Repo.get_by(Easy.Coaches.Coach, email: "test@coach.com") do
      nil ->
        IO.puts("Creating test coach...")

        {:ok, coach} =
          Easy.Repo.insert(%Easy.Coaches.Coach{
            business_id: business_id,
            email: "test@coach.com",
            first_name: "Test",
            last_name: "Coach",
            status: "active"
          })

        coach

      coach ->
        IO.puts("Using existing test coach: #{coach.first_name} #{coach.last_name}")
        coach
    end
  end

  def print_recipe(recipe) do
    IO.puts("\n📋 Recipe: #{recipe.name}")
    IO.puts("   ID: #{recipe.id}")
    IO.puts("   Description: #{recipe.description || "N/A"}")
    IO.puts("   Prep Time: #{recipe.prep_time_minutes || "N/A"} min")
    IO.puts("   Servings: #{recipe.servings || "N/A"}")
    IO.puts("   Status: #{recipe.status}")

    if length(recipe.ingredients) > 0 do
      IO.puts("   Ingredients:")

      Enum.each(recipe.ingredients, fn ing ->
        IO.puts("     - #{ing["name"]}: #{ing["quantity"]} #{ing["unit"]}")
      end)
    else
      IO.puts("   Ingredients: None")
    end

    IO.puts("   Nutrition:")
    IO.puts("     Calories: #{recipe.total_calories || "N/A"} kcal")
    IO.puts("     Protein: #{recipe.total_protein || "N/A"} g")
    IO.puts("     Carbs: #{recipe.total_carbohydrates || "N/A"} g")
    IO.puts("     Fats: #{recipe.total_fats || "N/A"} g")
    IO.puts("     Fiber: #{recipe.total_fiber || "N/A"} g")
  end
end

# Setup
business = TestHelper.get_or_create_test_business()
coach = TestHelper.get_or_create_test_coach(business.id)

IO.puts("\n✅ Test environment ready!")
IO.puts("   Business ID: #{business.id}")
IO.puts("   Coach ID: #{coach.id}")

# Test 1: Create a recipe with ingredients
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 1: Creating recipe with ingredients")
IO.puts(String.duplicate("=", 60))

recipe_attrs = %{
  business_id: business.id,
  created_by_id: coach.id,
  name: "Test Grilled Salmon",
  description: "Delicious grilled salmon with lemon and dill",
  instructions: "1. Season salmon\n2. Grill for 5 minutes per side\n3. Serve with lemon",
  prep_time_minutes: 25,
  servings: 2,
  ingredients: [
    %{name: "Salmon fillet", quantity: 400, unit: "g"},
    %{name: "Lemon", quantity: 1, unit: "piece"},
    %{name: "Fresh dill", quantity: 2, unit: "tbsp"},
    %{name: "Olive oil", quantity: 15, unit: "ml"}
  ],
  total_calories: 450,
  total_protein: 42,
  total_carbohydrates: 8,
  total_fats: 28,
  total_fiber: 2,
  status: "active"
}

case %Recipe{} |> Recipe.create_changeset(recipe_attrs) |> Repo.insert() do
  {:ok, recipe} ->
    IO.puts("✅ Recipe created successfully!")
    TestHelper.print_recipe(recipe)

  {:error, changeset} ->
    IO.puts("❌ Failed to create recipe:")
    IO.inspect(changeset.errors)
end

# Test 2: Create recipe with string quantities (should be normalized)
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 2: Creating recipe with string quantities")
IO.puts(String.duplicate("=", 60))

recipe_attrs_2 = %{
  business_id: business.id,
  created_by_id: coach.id,
  name: "Test Protein Smoothie",
  description: "Quick protein smoothie",
  prep_time_minutes: 5,
  servings: 1,
  ingredients: [
    # String quantity
    %{name: "Protein powder", quantity: "30", unit: "g"},
    # String quantity
    %{name: "Banana", quantity: "1", unit: "piece"},
    # String quantity
    %{name: "Almond milk", quantity: "300", unit: "ml"}
  ],
  total_calories: 280,
  total_protein: 25,
  status: "active"
}

case %Recipe{} |> Recipe.create_changeset(recipe_attrs_2) |> Repo.insert() do
  {:ok, recipe} ->
    IO.puts("✅ Recipe with string quantities created successfully!")
    TestHelper.print_recipe(recipe)

  {:error, changeset} ->
    IO.puts("❌ Failed to create recipe:")
    IO.inspect(changeset.errors)
end

# Test 3: List all recipes
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 3: Listing all recipes")
IO.puts(String.duplicate("=", 60))

recipes = Recipe |> Repo.all()
IO.puts("\nFound #{length(recipes)} recipe(s):")

Enum.each(recipes, fn recipe ->
  IO.puts("  • #{recipe.name} (#{length(recipe.ingredients)} ingredients)")
end)

# Test 4: Update a recipe
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 4: Updating a recipe")
IO.puts(String.duplicate("=", 60))

if length(recipes) > 0 do
  recipe = List.first(recipes)
  IO.puts("Updating: #{recipe.name}")

  update_attrs = %{
    description: "UPDATED: " <> (recipe.description || ""),
    total_calories: 500
  }

  case recipe |> Recipe.update_changeset(update_attrs) |> Repo.update() do
    {:ok, updated} ->
      IO.puts("✅ Recipe updated successfully!")
      TestHelper.print_recipe(updated)

    {:error, changeset} ->
      IO.puts("❌ Failed to update recipe:")
      IO.inspect(changeset.errors)
  end
else
  IO.puts("⚠️  No recipes to update")
end

# Test 5: Query recipes
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 5: Advanced queries")
IO.puts(String.duplicate("=", 60))

# High protein recipes
high_protein =
  Recipe
  |> where([r], r.total_protein > 30)
  |> Repo.all()

IO.puts("\nHigh protein recipes (>30g): #{length(high_protein)}")

Enum.each(high_protein, fn r ->
  IO.puts("  • #{r.name}: #{r.total_protein}g protein")
end)

# Quick recipes
quick =
  Recipe
  |> where([r], r.prep_time_minutes <= 15)
  |> Repo.all()

IO.puts("\nQuick recipes (≤15 min): #{length(quick)}")

Enum.each(quick, fn r ->
  IO.puts("  • #{r.name}: #{r.prep_time_minutes} min")
end)

# Average calories
avg_calories =
  Recipe
  |> select([r], avg(r.total_calories))
  |> Repo.one()

if avg_calories do
  IO.puts("\nAverage calories: #{Float.round(Decimal.to_float(avg_calories), 2)} kcal")
end

# Test 6: Invalid recipe (should fail)
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("TEST 6: Creating invalid recipe (should fail)")
IO.puts(String.duplicate("=", 60))

invalid_attrs = %{
  business_id: business.id,
  created_by_id: coach.id,
  # Invalid: empty name
  name: "",
  ingredients: [
    # Invalid: empty name, negative quantity
    %{name: "", quantity: -1, unit: ""}
  ]
}

case %Recipe{} |> Recipe.create_changeset(invalid_attrs) |> Repo.insert() do
  {:ok, _recipe} ->
    IO.puts("❌ Should have failed but didn't!")

  {:error, changeset} ->
    IO.puts("✅ Correctly rejected invalid recipe!")
    IO.puts("   Errors:")

    Enum.each(changeset.errors, fn {field, {msg, _}} ->
      IO.puts("     - #{field}: #{msg}")
    end)
end

# Summary
IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("📊 SUMMARY")
IO.puts(String.duplicate("=", 60))

total_recipes = Recipe |> select([r], count(r.id)) |> Repo.one()

active_recipes =
  Recipe |> where([r], r.status == "active") |> select([r], count(r.id)) |> Repo.one()

IO.puts("Total recipes: #{total_recipes}")
IO.puts("Active recipes: #{active_recipes}")

if total_recipes > 0 do
  with_ingredients =
    Recipe
    |> where([r], fragment("jsonb_array_length(ingredients) > 0"))
    |> select([r], count(r.id))
    |> Repo.one()

  IO.puts("Recipes with ingredients: #{with_ingredients}")
end

IO.puts("\n✅ All tests completed!\n")
