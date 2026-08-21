defmodule Easy.Nutrition.NutrientTotals do
  alias Easy.Nutrition.{Food, Recipe, RecipeIngredient}

  @type t() :: %{
          calories: float() | nil,
          protein: float() | nil,
          carbohydrates: float() | nil,
          fat: float() | nil,
          fiber: float() | nil,
          complete: boolean()
        }

  @empty %{
    calories: nil,
    protein: nil,
    carbohydrates: nil,
    fat: nil,
    fiber: nil,
    complete: false
  }

  @spec from_food(Food.t()) :: t()
  def from_food(%Food{} = food) do
    complete(
      food.calories_per_100g,
      food.protein_g_per_100g,
      food.carbs_g_per_100g,
      food.fat_g_per_100g,
      food.fiber_g_per_100g
    )
  end

  @spec from_recipe(Recipe.t()) :: t()
  def from_recipe(%Recipe{recipe_ingredients: ingredients}) when is_list(ingredients) do
    combine(Enum.map(ingredients, &from_ingredient/1))
  end

  def from_recipe(%Recipe{}), do: @empty

  @spec scale(t(), number()) :: t()
  def scale(_totals, factor) when not is_number(factor) or factor <= 0, do: @empty

  def scale(totals, factor) do
    complete(
      scale_field(totals.calories, factor),
      scale_field(totals.protein, factor),
      scale_field(totals.carbohydrates, factor),
      scale_field(totals.fat, factor),
      scale_field(totals.fiber, factor)
    )
  end

  @spec round(t()) :: t()
  def round(totals) do
    %{
      calories: round_one(totals.calories),
      protein: round_one(totals.protein),
      carbohydrates: round_one(totals.carbohydrates),
      fat: round_one(totals.fat),
      fiber: round_one(totals.fiber),
      complete: totals.complete
    }
  end

  @spec from_fields(map()) :: t()
  def from_fields(item) do
    complete(item.calories, item.protein, item.carbohydrates, item.fat, item.fiber)
  end

  @spec sum([map()]) :: t()
  def sum(items), do: combine(Enum.map(items, &from_fields/1))

  @spec combine([t()]) :: t()
  def combine([]), do: @empty
  def combine([first | rest]), do: Enum.reduce(rest, first, &add(&2, &1))

  defp from_ingredient(%RecipeIngredient{food: %Food{} = food, weight_g: weight})
       when is_number(weight) and weight > 0 do
    scale(from_food(food), weight / 100)
  end

  defp from_ingredient(_ingredient), do: @empty

  defp add(left, right) do
    complete(
      add_field(left.calories, right.calories),
      add_field(left.protein, right.protein),
      add_field(left.carbohydrates, right.carbohydrates),
      add_field(left.fat, right.fat),
      add_field(left.fiber, right.fiber)
    )
  end

  defp complete(calories, protein, carbohydrates, fat, fiber) do
    %{
      calories: calories,
      protein: protein,
      carbohydrates: carbohydrates,
      fat: fat,
      fiber: fiber,
      complete:
        not is_nil(calories) and not is_nil(protein) and not is_nil(carbohydrates) and not is_nil(fat) and
          not is_nil(fiber)
    }
  end

  defp add_field(nil, _other), do: nil
  defp add_field(_value, nil), do: nil
  defp add_field(left, right), do: left + right

  defp scale_field(nil, _factor), do: nil
  defp scale_field(value, factor), do: value * factor

  defp round_one(nil), do: nil
  defp round_one(value) when is_number(value), do: Float.round(value / 1, 1)
end
