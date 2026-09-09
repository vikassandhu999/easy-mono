defmodule Easy.Nutrition.Portions do
  alias Easy.Nutrition.{Food, Portion, Recipe}

  @spec for_food(Food.t()) :: %{default_portion: Portion.t(), portion_options: [Portion.t()]}
  def for_food(%Food{serving_sizes: sizes}) do
    sizes = sizes || []
    default = Enum.find(sizes, & &1.is_default)

    %{
      default_portion: if(default, do: food_serving(default), else: grams()),
      portion_options: [grams() | Enum.map(sizes, &food_serving/1)]
    }
  end

  @spec for_recipe(Recipe.t()) :: %{default_portion: Portion.t(), portion_options: [Portion.t()]}
  def for_recipe(%Recipe{cooked_weight_g: weight}) do
    serving = %{kind: :serving, amount: 1.0, unit: "serving", label: nil}

    %{
      default_portion: serving,
      portion_options: if(is_number(weight) and weight > 0, do: [serving, grams()], else: [serving])
    }
  end

  @spec resolve_food(Food.t(), Portion.t()) ::
          {:ok, Portion.t()}
          | {:error, :invalid_portion}
  def resolve_food(_food, %{kind: :gram, grams: grams})
      when is_number(grams) and grams > 0 do
    {:ok, %{kind: :gram, grams: grams / 1}}
  end

  def resolve_food(%Food{serving_sizes: sizes}, %{
        kind: :serving,
        amount: amount,
        unit: unit,
        label: label
      })
      when is_number(amount) and amount > 0 and is_binary(unit) do
    case Enum.find(sizes, &(&1.unit == unit and &1.label == label)) do
      %{amount: serving_amount, weight_g: weight_g} when serving_amount > 0 and weight_g > 0 ->
        grams = amount / serving_amount * weight_g

        if grams > 0 do
          {:ok, %{kind: :serving, grams: grams / 1, amount: amount / 1, unit: unit, label: label}}
        else
          {:error, :invalid_portion}
        end

      _missing ->
        {:error, :invalid_portion}
    end
  end

  def resolve_food(_food, _portion), do: {:error, :invalid_portion}

  @spec resolve_recipe(Recipe.t(), Portion.t()) ::
          {:ok, Portion.t()} | {:error, :invalid_portion}
  def resolve_recipe(%Recipe{servings_count: servings, cooked_weight_g: cooked}, %{
        kind: :serving,
        amount: amount,
        unit: "serving",
        label: nil
      })
      when is_integer(servings) and servings > 0 and is_number(amount) and amount > 0 do
    grams =
      case cooked do
        weight when is_number(weight) and weight > 0 -> amount / servings * weight
        _missing -> nil
      end

    {:ok, %{kind: :serving, amount: amount / 1, grams: grams, unit: "serving", label: nil}}
  end

  def resolve_recipe(%Recipe{cooked_weight_g: cooked}, %{kind: :gram, grams: grams})
      when is_number(cooked) and cooked > 0 and is_number(grams) and grams > 0 do
    {:ok, %{kind: :gram, grams: grams / 1}}
  end

  def resolve_recipe(_recipe, _portion), do: {:error, :invalid_portion}

  defp grams, do: %{kind: :gram, grams: 100.0}

  defp food_serving(size),
    do: %{kind: :serving, amount: size.amount, unit: size.unit, label: size.label}
end
