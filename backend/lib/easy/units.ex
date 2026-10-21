defmodule Easy.Units do
  @factors %{"kg" => 1, "lb" => 0.45359237, "m" => 1, "km" => 1000, "mi" => 1609.344, "s" => 1}
  @spec convert(number() | Decimal.t(), String.t() | atom()) :: {:ok, Decimal.t()} | {:error, atom()}
  def convert(value, unit) do
    case Map.fetch(@factors, to_string(unit)) do
      {:ok, factor} -> {:ok, Decimal.mult(Decimal.new(to_string(value)), Decimal.new(to_string(factor)))}
      :error -> {:error, :invalid_unit}
    end
  end

  @tracker_units %{
    "kg" => [{"kg", 1.0}, {"lb", 0.45359237}],
    "cm" => [{"cm", 1.0}, {"in", 2.54}],
    "ml" => [{"ml", 1.0}, {"fl_oz", 29.5735295625}],
    "hours" => [{"hours", 1.0}],
    "steps" => [{"steps", 1.0}]
  }

  @spec tracker_options(map()) :: [map()]
  def tracker_options(%{kind: :number, business_id: nil, base_unit: unit}) do
    Enum.map(Map.get(@tracker_units, unit, [{unit, 1.0}]), fn {name, factor} -> %{unit: name, to_base_factor: factor} end)
  end

  def tracker_options(%{kind: :number, base_unit: unit}), do: [%{unit: unit, to_base_factor: 1.0}]
  def tracker_options(_), do: []

  @spec tracker_value(map(), number() | Decimal.t(), String.t()) :: {:ok, Decimal.t()} | {:error, atom()}
  def tracker_value(tracker, value, unit) do
    case Enum.find(tracker_options(tracker), &(&1.unit == unit)) do
      nil -> {:error, :invalid_unit}
      option -> {:ok, Decimal.mult(Decimal.new(to_string(value)), Decimal.new(to_string(option.to_base_factor)))}
    end
  end

  @spec normalize(map()) :: {:ok, map()} | {:error, atom()}
  def normalize(attrs) do
    attrs = Map.new(attrs, fn {k, v} -> {to_string(k), v} end)

    with {:ok, attrs} <- measure(attrs, "load_value", "load_unit", "load_kg", "entered_load_unit", ["kg", "lb"]) do
      measure(attrs, "distance_value", "distance_unit", "distance_m", "entered_distance_unit", ["m", "km", "mi"])
    end
  end

  defp measure(attrs, value, unit, base, entered, allowed) do
    cond do
      not Map.has_key?(attrs, value) ->
        {:ok, attrs}

      is_nil(attrs[value]) ->
        {:ok, Map.merge(attrs, %{base => nil, entered => nil})}

      to_string(attrs[unit]) in allowed ->
        with {:ok, n} <- convert(attrs[value], attrs[unit]),
             do:
               {:ok,
                Map.merge(attrs, %{
                  base => Decimal.round(n, if(base == "load_kg", do: 3, else: 2)),
                  entered => attrs[unit]
                })}

      true ->
        {:error, :invalid_unit}
    end
  end
end
