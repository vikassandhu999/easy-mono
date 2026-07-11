defmodule Easy.MacroCalc do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient

  @macros [:calories, :protein_g, :carbs_g, :fat_g, :fiber_g]
  @zero %{calories: 0.0, protein_g: 0.0, carbs_g: 0.0, fat_g: 0.0, fiber_g: 0.0}

  @type macros :: %{
          calories: float(),
          protein_g: float(),
          carbs_g: float(),
          fat_g: float(),
          fiber_g: float()
        }

  @spec macro_keys() :: [atom()]
  def macro_keys, do: @macros

  @spec for_food(Food.t(), float() | nil) :: macros()
  def for_food(%Food{} = food, weight_g) do
    factor = num(weight_g) / 100.0

    %{
      calories: round1(num(food.calories_per_100g) * factor),
      protein_g: round1(num(food.protein_g_per_100g) * factor),
      carbs_g: round1(num(food.carbs_g_per_100g) * factor),
      fat_g: round1(num(food.fat_g_per_100g) * factor),
      fiber_g: round1(num(food.fiber_g_per_100g) * factor)
    }
  end

  @spec recipe_totals(Recipe.t()) :: macros()
  def recipe_totals(%Recipe{recipe_ingredients: ingredients}) when is_list(ingredients) do
    ingredients
    |> Enum.reduce(@zero, fn
      %RecipeIngredient{food: %Food{} = food, weight_g: weight_g}, acc ->
        add(acc, for_food(food, weight_g))

      _ingredient_without_loaded_food, acc ->
        acc
    end)
    |> round_all()
  end

  def recipe_totals(_recipe), do: @zero

  @spec for_recipe(Recipe.t(), float() | nil) :: macros()
  def for_recipe(%Recipe{} = recipe, weight_g) do
    totals = recipe_totals(recipe)

    case recipe.cooked_weight_g do
      cooked when is_number(cooked) and cooked > 0 ->
        round_all(scale(totals, num(weight_g) / cooked))

      # ponytail: without cooked_weight_g we cannot resolve per-gram macros,
      # so return the whole-recipe totals. Plan 2 / UX should require cooked_weight_g.
      _ ->
        totals
    end
  end

  @spec for_recipe_servings(Recipe.t(), float() | nil) :: macros()
  def for_recipe_servings(%Recipe{} = recipe, amount) do
    servings =
      case recipe.servings_count do
        n when is_integer(n) and n > 0 -> n
        _ -> 1
      end

    amount = if is_number(amount) and amount > 0, do: amount, else: 1.0
    round_all(scale(recipe_totals(recipe), amount / servings))
  end

  @spec for_meal_item(MealItem.t()) :: macros()
  def for_meal_item(%MealItem{food: %Food{} = food, weight_g: weight_g}), do: for_food(food, weight_g)

  # Servings-sized recipe item (no gram weight recorded).
  def for_meal_item(%MealItem{recipe: %Recipe{} = recipe, weight_g: nil, amount: amount}),
    do: for_recipe_servings(recipe, amount)

  def for_meal_item(%MealItem{recipe: %Recipe{} = recipe, weight_g: weight_g}),
    do: for_recipe(recipe, weight_g)

  def for_meal_item(_item), do: @zero

  @spec meal_totals([MealItem.t()]) :: macros()
  def meal_totals(items) when is_list(items) do
    items
    |> Enum.reduce(@zero, fn item, acc -> add(acc, for_meal_item(item)) end)
    |> round_all()
  end

  def meal_totals(_), do: @zero

  defp add(a, b), do: Map.new(@macros, fn k -> {k, Map.fetch!(a, k) + Map.fetch!(b, k)} end)
  defp scale(m, factor), do: Map.new(@macros, fn k -> {k, Map.fetch!(m, k) * factor} end)
  defp round_all(m), do: Map.new(@macros, fn k -> {k, round1(Map.fetch!(m, k))} end)
  defp round1(value), do: Float.round(value * 1.0, 1)
  defp num(nil), do: 0.0
  defp num(value) when is_number(value), do: value * 1.0
end
