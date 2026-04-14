defmodule Easy.Nutrition.MacroCalc do
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

  @spec calories_keys() :: [String.t()]
  def calories_keys, do: ["calories_per_100g", "calories"]

  @spec protein_keys() :: [String.t()]
  def protein_keys, do: ["protein_g", "protein"]

  @spec carbs_keys() :: [String.t()]
  def carbs_keys, do: ["carbs_g", "carbs"]

  @spec fat_keys() :: [String.t()]
  def fat_keys, do: ["fat_g", "fat"]

  @spec compute_all(map(), float() | nil, float() | nil) :: %{
          calories: float(),
          protein_g: float(),
          carbs_g: float(),
          fat_g: float()
        }
  def compute_all(macros, weight_g, cooked_weight_g) do
    %{
      calories: compute(macros, calories_keys(), weight_g, cooked_weight_g),
      protein_g: compute(macros, protein_keys(), weight_g, cooked_weight_g),
      carbs_g: compute(macros, carbs_keys(), weight_g, cooked_weight_g),
      fat_g: compute(macros, fat_keys(), weight_g, cooked_weight_g)
    }
  end
end
