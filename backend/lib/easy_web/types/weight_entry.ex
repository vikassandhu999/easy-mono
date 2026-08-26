defmodule EasyWeb.Types.WeightEntry do
  use EasyWeb.Type

  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry, as: Entry

  @kg_to_lbs Decimal.new("2.20462")

  @type t :: %{
          required(:id) => String.t(),
          required(:date) => Date.t(),
          required(:value) => Decimal.t(),
          required(:unit) => :kg | :lbs,
          required(:note) => String.t() | nil,
          required(:form_submission_id) => String.t() | nil,
          required(:inserted_at) => DateTime.t()
        }

  @type create :: %{
          required(:date) => Date.t(),
          required(:value) => number(),
          required(:unit) => :kg | :lbs,
          optional(:note) => String.t() | nil
        }

  @type list_query :: %{optional(:since) => Date.t()}

  @type adherence :: %{
          required(:logged_days) => non_neg_integer(),
          required(:window_days) => pos_integer()
        }

  @spec index([Entry.t()], Client.t(), adherence()) :: map()
  def index(entries, client, adherence) do
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

defmodule EasyWeb.Types.WeightEntryIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:entries) => [EasyWeb.Types.WeightEntry.t()],
          required(:goal) =>
            %{
              required(:value) => Decimal.t(),
              required(:unit) => :kg | :lbs
            }
            | nil,
          required(:summary) => %{
            required(:first_entry) =>
              %{
                required(:date) => Date.t(),
                required(:value) => Decimal.t(),
                required(:unit) => :kg | :lbs
              }
              | nil,
            required(:latest_entry) =>
              %{
                required(:date) => Date.t(),
                required(:value) => Decimal.t(),
                required(:unit) => :kg | :lbs
              }
              | nil,
            required(:total_change) => float() | nil,
            required(:change_unit) => :kg | :lbs | nil
          },
          required(:adherence) => %{
            required(:logged_days) => non_neg_integer(),
            required(:window_days) => pos_integer()
          }
        }
end
