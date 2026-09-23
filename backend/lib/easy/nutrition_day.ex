defmodule Easy.Nutrition.Day do
  alias Easy.Nutrition.MealSlot
  alias Easy.Nutrition.NutrientTotals

  @type t() :: %{
          date: Date.t(),
          plan_id: String.t() | nil,
          write_eligible: boolean(),
          applied_timezone: String.t(),
          targets: targets(),
          slots: [slot()],
          summary: summary()
        }

  @type list_result() :: %{nutrition_days: [t()]}

  @type slot() :: %{
          optional(:id) => String.t() | nil,
          optional(:shared_at) => DateTime.t() | nil,
          optional(:note_to_coach) => String.t() | nil,
          meal_slot: MealSlot.t(),
          meal_id: String.t() | nil,
          revision: non_neg_integer(),
          applied_timezone: String.t() | nil,
          write_eligible: boolean(),
          planned_calories: number() | nil,
          logged_calories: number() | nil,
          options: [option()],
          rows: [row()]
        }

  @type option() :: %{
          meal_id: String.t() | nil,
          meal_name: String.t() | nil,
          position: non_neg_integer(),
          items: [planned_item()]
        }

  @type planned_item() :: %{
          planned_item_ref: String.t(),
          kind: :food | :recipe,
          name: String.t() | nil,
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          position: non_neg_integer(),
          portion: portion(),
          nutrients: NutrientTotals.t()
        }

  @type row() :: %{
          id: String.t(),
          entry_id: String.t() | nil,
          planned_item_ref: String.t() | nil,
          status: :as_planned | :swapped | :added | :recorded | :pending | :skipped,
          kind: :food | :recipe,
          name: String.t(),
          food_id: String.t() | nil,
          recipe_id: String.t() | nil,
          portion: portion(),
          nutrients: NutrientTotals.t(),
          notes: String.t() | nil
        }

  @type targets() :: %{
          calories: number() | nil,
          protein_g: number() | nil,
          carbs_g: number() | nil,
          fat_g: number() | nil,
          fiber_g: number() | nil
        }

  @type summary() :: %{
          logged: NutrientTotals.t(),
          planned: NutrientTotals.t(),
          counts: %{
            as_planned: non_neg_integer(),
            swapped: non_neg_integer(),
            added: non_neg_integer(),
            recorded: non_neg_integer(),
            pending: non_neg_integer(),
            skipped: non_neg_integer()
          },
          has_intake: boolean(),
          adherence: :none | :under | :on | :over | nil
        }

  @type portion() :: Easy.Nutrition.Portion.t()
  @spec format(t(), MapSet.t({:food | :recipe, String.t()})) :: t()
  def format(day, available) do
    day |> available_sources(available) |> round_values()
  end

  @spec summarize([slot()], targets()) :: summary()
  def summarize(slots, targets) do
    rows = Enum.flat_map(slots, & &1.rows)
    entries = Enum.reject(rows, &is_nil(&1.entry_id))
    logged = NutrientTotals.combine(Enum.map(entries, & &1.nutrients))
    planned = NutrientTotals.combine(Enum.map(Enum.flat_map(slots, &active_option_items/1), & &1.nutrients))

    %{
      logged: logged,
      planned: planned,
      counts: status_counts(rows),
      has_intake: entries != [],
      adherence: calorie_adherence(entries, logged.calories, targets.calories)
    }
  end

  defp active_option_items(slot) do
    option = Enum.find(slot.options, &(&1.meal_id == slot.meal_id))
    (option && option.items) || []
  end

  defp status_counts(rows) do
    Map.merge(
      %{as_planned: 0, swapped: 0, added: 0, recorded: 0, pending: 0, skipped: 0},
      Enum.frequencies_by(rows, & &1.status)
    )
  end

  defp calorie_adherence([], _logged, _target), do: :none

  defp calorie_adherence(_entries, logged, target)
       when is_number(logged) and is_number(target) and target > 0,
       do: calorie_band(logged / target)

  defp calorie_adherence(_entries, _logged, _target), do: nil

  defp calorie_band(pct) when pct < 0.9, do: :under
  defp calorie_band(pct) when pct > 1.1, do: :over
  defp calorie_band(_pct), do: :on

  # Hide unavailable Library links in item views while preserving frozen values and identity in storage.
  defp available_sources(%{food_id: food_id, recipe_id: recipe_id} = item, available) do
    %{
      item
      | food_id: if(MapSet.member?(available, {:food, food_id}), do: food_id),
        recipe_id: if(MapSet.member?(available, {:recipe, recipe_id}), do: recipe_id)
    }
  end

  defp available_sources(%_{} = value, _available), do: value

  defp available_sources(map, available) when is_map(map) do
    Map.new(map, fn {key, value} -> {key, available_sources(value, available)} end)
  end

  defp available_sources(list, available) when is_list(list), do: Enum.map(list, &available_sources(&1, available))
  defp available_sources(value, _available), do: value

  # Round display numbers to one decimal; structs and chosen portion precision pass through unchanged.
  defp round_values(%_{} = value), do: value

  defp round_values(map) when is_map(map),
    do:
      Map.new(map, fn
        {:portion, portion} -> {:portion, portion}
        {key, value} -> {key, round_values(value)}
      end)

  defp round_values(list) when is_list(list), do: Enum.map(list, &round_values/1)
  defp round_values(value) when is_float(value), do: Float.round(value, 1)
  defp round_values(value), do: value
end
