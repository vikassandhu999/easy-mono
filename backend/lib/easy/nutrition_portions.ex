defmodule Easy.Nutrition.Portions do
  alias Easy.Nutrition.{Food, Recipe}

  @type t() ::
          %{required(:kind) => :gram, required(:grams) => number()}
          | %{
              required(:kind) => :serving,
              required(:amount) => number(),
              required(:unit) => String.t(),
              required(:label) => String.t() | nil
            }

  @spec for_food(Food.t()) :: %{default_portion: t(), portion_options: [t()]}
  def for_food(%Food{serving_sizes: sizes}) do
    sizes = sizes || []
    default = Enum.find(sizes, & &1.is_default)

    %{
      default_portion: if(default, do: food_serving(default), else: grams()),
      portion_options: [grams() | Enum.map(sizes, &food_serving/1)]
    }
  end

  @spec for_recipe(Recipe.t()) :: %{default_portion: t(), portion_options: [t()]}
  def for_recipe(%Recipe{cooked_weight_g: weight}) do
    serving = %{kind: :serving, amount: 1.0, unit: "serving", label: nil}

    %{
      default_portion: serving,
      portion_options: if(is_number(weight) and weight > 0, do: [serving, grams()], else: [serving])
    }
  end

  @spec from_snapshot(map()) :: t()
  def from_snapshot(%{portion_kind: :gram, weight_g: grams}),
    do: %{kind: :gram, grams: grams}

  def from_snapshot(%{portion_kind: :serving, amount: amount, unit: unit, serving_label: label}),
    do: %{kind: :serving, amount: amount, unit: unit, label: label}

  defp grams, do: %{kind: :gram, grams: 100.0}

  defp food_serving(size),
    do: %{kind: :serving, amount: size.amount, unit: size.unit, label: size.label}
end
