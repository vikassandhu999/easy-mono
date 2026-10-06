defmodule Easy.Nutrition.Nutrients do
  @registry %{
    "energy_kcal" => "kcal",
    "protein_g" => "g",
    "carbs_g" => "g",
    "fat_g" => "g",
    "fiber_g" => "g",
    "sugar_g" => "g",
    "sodium_mg" => "mg",
    "calcium_mg" => "mg",
    "iron_mg" => "mg",
    "potassium_mg" => "mg",
    "vitamin_c_mg" => "mg"
  }
  @spec registry() :: map()
  def registry, do: @registry
  @spec valid?(term()) :: boolean()
  def valid?(values) when is_map(values),
    do: Enum.all?(values, fn {code, n} -> Map.has_key?(@registry, to_string(code)) and is_number(n) and n >= 0 end)

  def valid?(_), do: false
  @spec scale(map(), number()) :: map()
  def scale(values, factor), do: Map.new(values, fn {code, n} -> {to_string(code), Float.round(n * factor / 1, 4)} end)
  @spec totals([map()]) :: map()
  def totals(entries) do
    Map.new(@registry, fn {code, _} ->
      values = Enum.flat_map(entries, &known_value(&1, code))

      {code,
       %{
         value: if(entries != [] and length(values) == length(entries), do: Enum.sum(values), else: nil),
         known_entries: length(values),
         total_entries: length(entries)
       }}
    end)
  end

  defp known_value(entry, code) do
    case Map.fetch(entry, code) do
      {:ok, n} -> [n]
      :error -> []
    end
  end

  @spec sum([map()]) :: map()
  def sum(entries),
    do:
      entries
      |> totals()
      |> Enum.flat_map(fn {k, v} -> if is_nil(v.value), do: [], else: [{k, v.value}] end)
      |> Map.new()
end
