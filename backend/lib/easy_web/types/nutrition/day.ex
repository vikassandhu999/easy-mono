defmodule EasyWeb.Types.Nutrition.NutritionDayTargets do
  use EasyWeb.Type

  @type t :: %{
          required(:calories) => float() | nil,
          required(:protein_g) => float() | nil,
          required(:carbs_g) => float() | nil,
          required(:fat_g) => float() | nil,
          required(:fiber_g) => float() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDayOptionItem do
  use EasyWeb.Type

  @type t :: %{
          required(:planned_item_ref) => String.t(),
          required(:kind) => :food | :recipe,
          required(:name) => String.t() | nil,
          required(:food_id) => String.t() | nil,
          required(:recipe_id) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t()
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDayOption do
  use EasyWeb.Type

  @type t :: %{
          required(:meal_id) => String.t() | nil,
          required(:meal_name) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:items) => [EasyWeb.Types.Nutrition.NutritionDayOptionItem.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDayRow do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:entry_id) => String.t() | nil,
          required(:planned_item_ref) => String.t() | nil,
          required(:status) => :as_planned | :swapped | :pending | :skipped | :added | :recorded,
          required(:kind) => :food | :recipe,
          required(:name) => String.t(),
          required(:food_id) => String.t() | nil,
          required(:recipe_id) => String.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDaySlot do
  use EasyWeb.Type

  @type t :: %{
          required(:meal_slot) =>
            :early_morning
            | :breakfast
            | :mid_morning
            | :lunch
            | :afternoon
            | :evening
            | :dinner
            | :pre_sleep
            | :pre_workout
            | :during_workout
            | :post_workout,
          required(:meal_id) => String.t() | nil,
          required(:revision) => non_neg_integer(),
          required(:applied_timezone) => String.t() | nil,
          required(:write_eligible) => boolean(),
          required(:planned_calories) => float() | nil,
          required(:logged_calories) => float() | nil,
          required(:options) => [EasyWeb.Types.Nutrition.NutritionDayOption.t()],
          required(:rows) => [EasyWeb.Types.Nutrition.NutritionDayRow.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDaySummaryCounts do
  use EasyWeb.Type

  @type t :: %{
          required(:as_planned) => non_neg_integer(),
          required(:swapped) => non_neg_integer(),
          required(:added) => non_neg_integer(),
          required(:recorded) => non_neg_integer(),
          required(:pending) => non_neg_integer(),
          required(:skipped) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDaySummary do
  use EasyWeb.Type

  @type t :: %{
          required(:logged) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:planned) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:counts) => EasyWeb.Types.Nutrition.NutritionDaySummaryCounts.t(),
          required(:has_intake) => boolean(),
          required(:adherence) => :none | :under | :on | :over | nil
        }
end

defmodule EasyWeb.Types.Nutrition.DayEntryInput do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:planned_item_ref) => String.t() | nil,
          required(:food_id) => String.t() | nil,
          required(:recipe_id) => String.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.DaySlotInput do
  use EasyWeb.Type

  @type t :: %{
          required(:meal_slot) =>
            :early_morning
            | :breakfast
            | :mid_morning
            | :lunch
            | :afternoon
            | :evening
            | :dinner
            | :pre_sleep
            | :pre_workout
            | :during_workout
            | :post_workout,
          required(:expected_revision) => non_neg_integer(),
          required(:meal_id) => String.t() | nil,
          required(:entries) => [EasyWeb.Types.Nutrition.DayEntryInput.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.Day do
  use EasyWeb.Type

  alias Easy.Nutrition.Day, as: NutritionDay
  alias Easy.Nutrition.NutrientTotals

  @type t :: %{
          required(:date) => Date.t(),
          required(:plan_id) => String.t() | nil,
          required(:write_eligible) => boolean(),
          required(:applied_timezone) => String.t(),
          required(:targets) => EasyWeb.Types.Nutrition.NutritionDayTargets.t(),
          required(:summary) => EasyWeb.Types.Nutrition.NutritionDaySummary.t(),
          required(:slots) => [EasyWeb.Types.Nutrition.NutritionDaySlot.t()]
        }

  @type list_query :: %{
          optional(:date) => String.t(),
          optional(:from) => String.t(),
          optional(:to) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer()
        }

  @type save :: %{required(:slots) => [EasyWeb.Types.Nutrition.DaySlotInput.t()]}

  @spec format(NutritionDay.t()) :: t()
  def format(%{
        date: date,
        plan_id: plan_id,
        write_eligible: write_eligible,
        applied_timezone: applied_timezone,
        targets: targets,
        summary: summary,
        slots: slots
      }) do
    %{
      date: date,
      plan_id: plan_id,
      write_eligible: write_eligible,
      applied_timezone: applied_timezone,
      targets: format_targets(targets),
      summary: format_summary(summary),
      slots: Enum.map(slots, &format_slot/1)
    }
  end

  defp format_targets(%{
         calories: calories,
         protein_g: protein_g,
         carbs_g: carbs_g,
         fat_g: fat_g,
         fiber_g: fiber_g
       }) do
    %{
      calories: round_one(calories),
      protein_g: round_one(protein_g),
      carbs_g: round_one(carbs_g),
      fat_g: round_one(fat_g),
      fiber_g: round_one(fiber_g)
    }
  end

  defp format_summary(%{
         logged: logged,
         planned: planned,
         counts: counts,
         has_intake: has_intake,
         adherence: adherence
       }) do
    %{
      logged: NutrientTotals.round(logged),
      planned: NutrientTotals.round(planned),
      counts: counts,
      has_intake: has_intake,
      adherence: adherence
    }
  end

  defp format_slot(%{
         meal_slot: meal_slot,
         meal_id: meal_id,
         revision: revision,
         applied_timezone: applied_timezone,
         write_eligible: write_eligible,
         planned_calories: planned_calories,
         logged_calories: logged_calories,
         options: options,
         rows: rows
       }) do
    %{
      meal_slot: meal_slot,
      meal_id: meal_id,
      revision: revision,
      applied_timezone: applied_timezone,
      write_eligible: write_eligible,
      planned_calories: round_one(planned_calories),
      logged_calories: round_one(logged_calories),
      options: Enum.map(options, &format_option/1),
      rows: Enum.map(rows, &format_row/1)
    }
  end

  defp format_option(%{meal_id: meal_id, meal_name: meal_name, position: position, items: items}) do
    %{
      meal_id: meal_id,
      meal_name: meal_name,
      position: position,
      items: Enum.map(items, &format_item/1)
    }
  end

  defp format_item(nil), do: nil

  defp format_item(%{
         planned_item_ref: planned_item_ref,
         kind: kind,
         name: name,
         food_id: food_id,
         recipe_id: recipe_id,
         position: position,
         portion: portion,
         nutrients: nutrients
       }) do
    %{
      planned_item_ref: planned_item_ref,
      kind: kind,
      name: name,
      food_id: food_id,
      recipe_id: recipe_id,
      position: position,
      portion: portion,
      nutrients: NutrientTotals.round(nutrients)
    }
  end

  defp format_row(row), do: %{row | nutrients: NutrientTotals.round(row.nutrients)}

  defp round_one(nil), do: nil
  defp round_one(value) when is_number(value), do: Float.round(value / 1, 1)
end
