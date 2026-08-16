defmodule Easy.Nutrition.NutrientTotals do
  alias Easy.Nutrition.Food

  @type t() :: %{
          calories: float() | nil,
          protein: float() | nil,
          carbohydrates: float() | nil,
          fat: float() | nil,
          fiber: float() | nil,
          complete: boolean()
        }

  @spec from_food(Food.t()) :: t()
  def from_food(%Food{} = food) do
    calories = food.calories_per_100g
    protein = food.protein_g_per_100g
    carbohydrates = food.carbs_g_per_100g
    fat = food.fat_g_per_100g
    fiber = food.fiber_g_per_100g

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

  defp round_one(nil), do: nil
  defp round_one(value) when is_number(value), do: Float.round(value / 1, 1)
end
