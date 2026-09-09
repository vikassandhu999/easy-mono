defmodule Easy.Nutrition.NutrientTotals do
  use Ecto.Type

  alias Easy.Nutrition.{Food, Portions, Recipe, RecipeIngredient}

  @fields [:calories, :protein, :carbohydrates, :fat, :fiber]

  @type t() :: %{
          calories: number() | nil,
          protein: number() | nil,
          carbohydrates: number() | nil,
          fat: number() | nil,
          fiber: number() | nil,
          complete: boolean()
        }

  @type values :: %{
          calories: number() | nil,
          protein: number() | nil,
          carbohydrates: number() | nil,
          fat: number() | nil,
          fiber: number() | nil
        }
  @type item :: %{required(:nutrients) => t(), optional(atom()) => term()}

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

  @impl Ecto.Type
  @spec embed_as(atom()) :: :dump
  def embed_as(_format), do: :dump

  @impl Ecto.Type
  @spec type() :: :map
  def type, do: :map

  @impl Ecto.Type
  @spec cast(term()) :: {:ok, t()} | :error
  def cast(values) when is_map(values) do
    nutrients = Map.take(values, @fields)

    if map_size(nutrients) == 5 and Enum.all?(Map.values(nutrients), &(is_nil(&1) or (is_number(&1) and &1 >= 0))) do
      {:ok, Map.put(nutrients, :complete, Enum.all?(Map.values(nutrients), &is_number/1))}
    else
      :error
    end
  end

  def cast(_values), do: :error

  @impl Ecto.Type
  @spec load(term()) :: {:ok, t()} | :error
  def load(values) when is_map(values), do: cast(Map.new(@fields, &{&1, Map.get(values, to_string(&1))}))
  def load(_values), do: :error

  @impl Ecto.Type
  @spec dump(term()) :: {:ok, values()} | :error
  def dump(values) do
    with {:ok, nutrients} <- cast(values) do
      {:ok, Map.delete(nutrients, :complete)}
    end
  end

  @spec sum([item()]) :: t()
  def sum(items), do: combine(Enum.map(items, & &1.nutrients))

  @spec combine([t()]) :: t()
  def combine([]), do: @empty
  def combine([first | rest]), do: Enum.reduce(rest, first, &add(&2, &1))

  defp from_ingredient(%RecipeIngredient{food: %Food{} = food, portion: portion}) do
    {:ok, resolved} = Portions.resolve_food(food, portion)
    scale(from_food(food), resolved.grams / 100)
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
