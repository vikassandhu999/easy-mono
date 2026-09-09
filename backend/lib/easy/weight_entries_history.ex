defmodule Easy.WeightEntries.History do
  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry, as: Entry

  @kg_to_lbs Decimal.new("2.20462")

  @type unit :: :kg | :lbs
  @type adherence :: %{logged_days: non_neg_integer(), window_days: pos_integer()}
  @type measurement :: %{date: Date.t(), value: Decimal.t(), unit: unit()}
  @type summary :: %{
          first_entry: measurement() | nil,
          latest_entry: measurement() | nil,
          total_change: float() | nil,
          change_unit: unit() | nil
        }
  @type t :: %{
          entries: [Entry.t()],
          goal: %{value: Decimal.t() | nil, unit: unit() | nil} | nil,
          summary: summary(),
          adherence: adherence()
        }

  @spec build([Entry.t()], Client.t(), adherence()) :: t()
  def build(entries, client, adherence) do
    %{
      entries: entries,
      goal: goal(client),
      summary: summary(entries),
      adherence: adherence
    }
  end

  defp goal(%Client{goal_weight_value: nil, goal_weight_unit: nil}), do: nil

  defp goal(%Client{} = client) do
    %{
      value: client.goal_weight_value,
      unit: client.goal_weight_unit
    }
  end

  defp summary([]) do
    %{
      first_entry: nil,
      latest_entry: nil,
      total_change: nil,
      change_unit: nil
    }
  end

  defp summary(entries) do
    first_entry = Enum.min_by(entries, & &1.date, Date)
    latest_entry = Enum.max_by(entries, & &1.date, Date)
    current_unit = latest_entry.unit
    first_value = convert_value(first_entry.value, first_entry.unit, current_unit)
    latest_value = convert_value(latest_entry.value, latest_entry.unit, current_unit)

    %{
      first_entry: summary_entry(first_entry, first_value, current_unit),
      latest_entry: summary_entry(latest_entry, latest_value, current_unit),
      total_change: latest_value |> Decimal.sub(first_value) |> Decimal.round(2) |> Decimal.to_float(),
      change_unit: current_unit
    }
  end

  defp summary_entry(entry, value, unit) do
    %{
      date: entry.date,
      value: value,
      unit: unit
    }
  end

  defp convert_value(value, unit, unit), do: Decimal.round(value, 2)
  defp convert_value(value, :kg, :lbs), do: value |> Decimal.mult(@kg_to_lbs) |> Decimal.round(2)
  defp convert_value(value, :lbs, :kg), do: value |> Decimal.div(@kg_to_lbs) |> Decimal.round(2)
end
