defmodule Easy.Nutrition.Values do
  alias Easy.Nutrition.Nutrient
  @spec encode(map()) :: map()
  def encode(attrs), do: attrs |> Jason.encode!() |> Jason.decode!()
  @spec nutrients?(term()) :: boolean()
  def nutrients?(values) when is_map(values),
    do: Enum.all?(values, fn {code, n} -> is_binary(to_string(code)) and is_number(n) and n >= 0 end)

  def nutrients?(_values), do: false
  @spec targets?(term()) :: boolean()
  def targets?(values) when is_map(values),
    do: Enum.all?(values, fn {code, bounds} -> is_binary(to_string(code)) and bounds?(bounds) end)

  def targets?(_values), do: false

  defp bounds?(bounds) when is_map(bounds) and map_size(bounds) in 1..2 do
    min = bounds["min"]
    max = bounds["max"]

    Enum.all?(bounds, fn {key, n} -> key in ["min", "max"] and is_number(n) and n >= 0 end) and
      (is_nil(min) or is_nil(max) or min <= max)
  end

  defp bounds?(_bounds), do: false
  @spec totals([map()]) :: map()
  def totals(entries) do
    codes = Enum.uniq(Nutrient.codes() ++ Enum.flat_map(entries, &Map.keys/1))

    Map.new(codes, fn code ->
      values = Enum.flat_map(entries, &known_value(&1, code))

      {code,
       %{
         value: if(values == [], do: nil, else: Enum.sum(values)),
         known_entries: length(values),
         total_entries: length(entries),
         incomplete: length(values) < length(entries)
       }}
    end)
  end

  defp known_value(entry, code), do: if(Map.has_key?(entry, code), do: [entry[code]], else: [])
  @spec scale(map(), number()) :: map()
  def scale(values, factor), do: Map.new(values, fn {code, value} -> {code, Float.round(value * factor / 1, 4)} end)
end
