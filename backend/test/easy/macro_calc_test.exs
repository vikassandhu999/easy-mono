defmodule Easy.MacroCalcTest do
  use ExUnit.Case, async: true

  alias Easy.MacroCalc
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  defp food(attrs) do
    struct(
      %Food{
        calories_per_100g: 0.0,
        protein_g_per_100g: 0.0,
        carbs_g_per_100g: 0.0,
        fat_g_per_100g: 0.0,
        fiber_g_per_100g: 0.0
      },
      attrs
    )
  end

  test "for_food scales per-100g values by weight" do
    chicken = food(calories_per_100g: 165.0, protein_g_per_100g: 31.0, fiber_g_per_100g: 0.0)

    assert MacroCalc.for_food(chicken, 200.0) == %{
             calories: 330.0,
             protein_g: 62.0,
             carbs_g: 0.0,
             fat_g: 0.0,
             fiber_g: 0.0
           }
  end

  test "for_food treats nil weight as zero" do
    assert MacroCalc.for_food(food(calories_per_100g: 100.0), nil) ==
             %{calories: 0.0, protein_g: 0.0, carbs_g: 0.0, fat_g: 0.0, fiber_g: 0.0}
  end

  test "recipe_totals sums ingredient contributions" do
    rice = food(calories_per_100g: 130.0, carbs_g_per_100g: 28.0, fiber_g_per_100g: 0.4)
    chicken = food(calories_per_100g: 165.0, protein_g_per_100g: 31.0)

    recipe = %Recipe{
      cooked_weight_g: 300.0,
      recipe_ingredients: [
        %RecipeIngredient{food: rice, weight_g: 100.0},
        %RecipeIngredient{food: chicken, weight_g: 200.0}
      ]
    }

    assert MacroCalc.recipe_totals(recipe) == %{
             calories: 460.0,
             protein_g: 62.0,
             carbs_g: 28.0,
             fat_g: 0.0,
             fiber_g: 0.4
           }
  end

  test "for_recipe scales totals by weight over cooked_weight_g" do
    recipe = %Recipe{
      cooked_weight_g: 300.0,
      recipe_ingredients: [
        %RecipeIngredient{food: food(calories_per_100g: 130.0), weight_g: 300.0}
      ]
    }

    # totals = 390 cal over 300 g cooked → 150 g serving = 195 cal
    assert MacroCalc.for_recipe(recipe, 150.0).calories == 195.0
  end

  test "for_meal_item dispatches on food vs recipe" do
    item = %MealItem{food: food(calories_per_100g: 200.0), recipe: nil, weight_g: 50.0}
    assert MacroCalc.for_meal_item(item).calories == 100.0
  end

  test "for_meal_item scales a servings-sized recipe item by servings_count" do
    recipe = %Recipe{
      servings_count: 2,
      recipe_ingredients: [
        %RecipeIngredient{food: food(calories_per_100g: 100.0), weight_g: 400.0}
      ]
    }

    # totals = 400 cal over 2 servings → 1 serving = 200, 3 servings = 600
    item = %MealItem{food: nil, recipe: recipe, weight_g: nil, amount: 1.0}
    assert MacroCalc.for_meal_item(item).calories == 200.0
    assert MacroCalc.for_meal_item(%{item | amount: 3.0}).calories == 600.0
  end

  test "for_meal_item treats a recipe without servings_count as one serving" do
    recipe = %Recipe{
      servings_count: nil,
      recipe_ingredients: [
        %RecipeIngredient{food: food(calories_per_100g: 100.0), weight_g: 400.0}
      ]
    }

    item = %MealItem{food: nil, recipe: recipe, weight_g: nil, amount: 2.0}
    assert MacroCalc.for_meal_item(item).calories == 800.0
  end

  test "meal_totals sums items" do
    items = [
      %MealItem{food: food(calories_per_100g: 100.0), weight_g: 100.0},
      %MealItem{food: food(calories_per_100g: 200.0), weight_g: 100.0}
    ]

    assert MacroCalc.meal_totals(items).calories == 300.0
  end
end
