defmodule Easy.Nutrition.ItemReference do
  alias Easy.Nutrition.{Food, NutrientTotals, Portion, Recipe}

  @type portion_input() :: Portion.t()

  @type resolved_portion() :: Portion.t()

  @type t() :: %{
          required(:kind) => :food | :recipe,
          required(:id) => String.t(),
          required(:portion) => portion_input()
        }

  @type resolved_item() :: %{
          required(:kind) => :food | :recipe,
          required(:item) => Food.t() | Recipe.t(),
          required(:portion) => resolved_portion(),
          required(:nutrients) => NutrientTotals.t()
        }

  @type resolved_items() :: %{t() => resolved_item()}

  @spec new(map(), portion_input()) :: t()
  def new(item, portion) do
    %{kind: kind(item), id: item.food_id || item.recipe_id, portion: portion}
  end

  @spec kind(map()) :: :food | :recipe
  def kind(%{food_id: id}) when is_binary(id), do: :food
  def kind(%{recipe_id: id}) when is_binary(id), do: :recipe
end
