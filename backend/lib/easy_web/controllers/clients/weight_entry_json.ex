defmodule EasyWeb.Clients.WeightEntryJSON do
  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry

  @kg_to_lbs Decimal.new("2.20462")

  @spec show(map()) :: map()
  def show(%{weight_entry: entry}) do
    %{data: entry_data(entry)}
  end

  @spec index(map()) :: map()
  def index(%{entries: entries, client: client}) do
    %{
      entries: Enum.map(entries, &entry_data/1),
      goal: goal_data(client),
      summary: summary_data(entries)
    }
  end

  defp entry_data(%WeightEntry{} = entry) do
    %{
      id: entry.id,
      date: entry.date,
      value: entry.value,
      unit: entry.unit,
      note: entry.note,
      form_submission_id: entry.form_submission_id,
      inserted_at: entry.inserted_at
    }
  end

  defp goal_data(%Client{goal_weight_value: nil, goal_weight_unit: nil}), do: nil

  defp goal_data(%Client{} = client) do
    %{
      value: client.goal_weight_value,
      unit: client.goal_weight_unit
    }
  end

  defp summary_data([]) do
    %{
      first_entry: nil,
      latest_entry: nil,
      total_change: nil,
      change_unit: nil
    }
  end

  defp summary_data(entries) do
    # Compute from the data directly — don't rely on caller's list ordering.
    first_entry = Enum.min_by(entries, & &1.date, Date)
    latest_entry = Enum.max_by(entries, & &1.date, Date)
    current_unit = latest_entry.unit
    first_value = convert_value(first_entry.value, first_entry.unit, current_unit)
    latest_value = convert_value(latest_entry.value, latest_entry.unit, current_unit)

    %{
      first_entry: summary_entry_data(first_entry, first_value, current_unit),
      latest_entry: summary_entry_data(latest_entry, latest_value, current_unit),
      total_change: latest_value |> Decimal.sub(first_value) |> Decimal.round(2) |> Decimal.to_float(),
      change_unit: current_unit
    }
  end

  defp summary_entry_data(entry, value, unit) do
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
