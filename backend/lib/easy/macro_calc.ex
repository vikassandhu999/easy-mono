defmodule Easy.MacroCalc do
  @spec compute(map(), [String.t()], float() | nil, float() | nil) :: float()
  def compute(macros, keys, weight_g, cooked_weight_g) do
    key = Enum.find(keys, &is_map_key(macros, &1))
    value = if key, do: (macros[key] || 0) * 1.0, else: 0.0
    weight_g = weight_g || 0.0

    result =
      cond do
        cooked_weight_g && cooked_weight_g > 0 ->
          value / cooked_weight_g * weight_g

        weight_g > 0 ->
          value * weight_g / 100

        true ->
          0.0
      end

    Float.round(result, 1)
  end

  @spec compute_all(map(), float() | nil, float() | nil) :: %{
          calories: float(),
          protein_g: float(),
          carbs_g: float(),
          fat_g: float()
        }
  def compute_all(macros, weight_g, cooked_weight_g) do
    %{
      calories: compute(macros, ["calories_per_100g", "calories"], weight_g, cooked_weight_g),
      protein_g: compute(macros, ["protein_g", "protein"], weight_g, cooked_weight_g),
      carbs_g: compute(macros, ["carbs_g", "carbs"], weight_g, cooked_weight_g),
      fat_g: compute(macros, ["fat_g", "fat"], weight_g, cooked_weight_g)
    }
  end
end
