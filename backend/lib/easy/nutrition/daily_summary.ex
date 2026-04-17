defmodule Easy.Nutrition.DailySummary do
  alias Easy.Nutrition.{MealLog, Plan}
  alias Easy.Repo

  @type macro_comparison :: %{
          actual: float(),
          target: float() | nil,
          unit: String.t()
        }

  @type t :: %{
          headline: String.t(),
          calories: macro_comparison(),
          protein: macro_comparison(),
          carbs: macro_comparison(),
          fats: macro_comparison()
        }

  @spec build(String.t(), String.t(), Date.t(), Plan.t() | nil) :: t()
  def build(business_id, client_id, date, plan) do
    logged = logged_macros(business_id, client_id, date)
    targets = plan_targets(plan)

    macros = %{
      calories: %{actual: logged.calories, target: targets[:calories], unit: "cal"},
      protein: %{actual: logged.protein_g, target: targets[:protein], unit: "g"},
      carbs: %{actual: logged.carbs_g, target: targets[:carbs], unit: "g"},
      fats: %{actual: logged.fat_g, target: targets[:fats], unit: "g"}
    }

    %{
      headline: compute_headline(macros),
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats
    }
  end

  defp logged_macros(business_id, client_id, date) do
    meal_logs =
      MealLog
      |> MealLog.for_business(business_id)
      |> MealLog.for_client(client_id)
      |> MealLog.for_date(date)
      |> MealLog.with_entries()
      |> Repo.all()

    entries = Enum.flat_map(meal_logs, & &1.food_log_entries)

    %{
      calories: sum_field(entries, :calories),
      protein_g: sum_field(entries, :protein_g),
      carbs_g: sum_field(entries, :carbs_g),
      fat_g: sum_field(entries, :fat_g)
    }
  end

  defp sum_field(entries, field) do
    entries
    |> Enum.reduce(0.0, fn entry, acc -> acc + (Map.get(entry, field) || 0.0) end)
    |> Float.round(1)
  end

  defp plan_targets(nil), do: %{}

  defp plan_targets(%Plan{macros_goal: nil}), do: %{}

  defp plan_targets(%Plan{macros_goal: goals}) when is_map(goals) do
    %{
      calories: parse_num(goals["calories"]),
      protein: parse_num(goals["protein"]),
      carbs: parse_num(goals["carbs"]),
      fats: parse_num(goals["fats"])
    }
  end

  defp parse_num(nil), do: nil
  defp parse_num(n) when is_number(n), do: n * 1.0
  defp parse_num(_), do: nil

  # -- Headline computation -------------------------------------------------
  #
  # Rules from spec Surface 4.1:
  #   - On track for everything → "On point today"
  #   - Killing one macro (>= 90% of target) → "Crushing protein" / "Crushing carbs"
  #   - Low on calories → "X cal under target"
  #   - Over calories → "Slightly over on calories"
  #   - Never failure framing

  defp compute_headline(macros) do
    cal = macros.calories
    protein = macros.protein

    cond do
      no_targets?(macros) ->
        nil

      all_on_track?(macros) ->
        "On point today"

      crushing?(protein) ->
        "Crushing protein"

      cal.target && cal.actual < cal.target ->
        diff = round(cal.target - cal.actual)
        "#{diff} cal under target"

      cal.target && cal.actual > cal.target * 1.05 ->
        "Slightly over on calories"

      true ->
        "On point today"
    end
  end

  defp no_targets?(macros) do
    is_nil(macros.calories.target) and is_nil(macros.protein.target)
  end

  defp all_on_track?(macros) do
    [:calories, :protein, :carbs, :fats]
    |> Enum.all?(fn key ->
      m = Map.get(macros, key)
      is_nil(m.target) or within_range?(m.actual, m.target)
    end)
  end

  defp crushing?(%{actual: actual, target: target}) when is_number(target) and target > 0 do
    actual / target >= 0.9
  end

  defp crushing?(_), do: false

  defp within_range?(actual, target) when is_number(target) and target > 0 do
    ratio = actual / target
    ratio >= 0.85 and ratio <= 1.1
  end

  defp within_range?(_, _), do: true
end
