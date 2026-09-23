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
          required(:planned_item_ref) => Ecto.UUID.t(),
          required(:kind) => :food | :recipe,
          required(:name) => String.t() | nil,
          required(:food_id) => Ecto.UUID.t() | nil,
          required(:recipe_id) => Ecto.UUID.t() | nil,
          required(:position) => non_neg_integer(),
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t()
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDayOption do
  use EasyWeb.Type

  @type t :: %{
          required(:meal_id) => Ecto.UUID.t() | nil,
          required(:meal_name) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:items) => [EasyWeb.Types.Nutrition.NutritionDayOptionItem.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDayRow do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:entry_id) => String.t() | nil,
          required(:planned_item_ref) => Ecto.UUID.t() | nil,
          required(:status) => :as_planned | :swapped | :pending | :skipped | :added | :recorded,
          required(:kind) => :food | :recipe,
          required(:name) => String.t(),
          required(:food_id) => Ecto.UUID.t() | nil,
          required(:recipe_id) => Ecto.UUID.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDaySlot do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t() | nil,
          required(:shared_at) => DateTime.t() | nil,
          required(:note_to_coach) => String.t() | nil,
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
          required(:meal_id) => Ecto.UUID.t() | nil,
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
          required(:id) => Ecto.UUID.t(),
          required(:planned_item_ref) => Ecto.UUID.t() | nil,
          required(:food_id) => Ecto.UUID.t() | nil,
          required(:recipe_id) => Ecto.UUID.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.DaySlotInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:share) => boolean(),
          optional(:note_to_coach) => String.t() | nil,
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
          required(:meal_id) => Ecto.UUID.t() | nil,
          required(:entries) => [EasyWeb.Types.Nutrition.DayEntryInput.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.Day do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:plan_id) => Ecto.UUID.t() | nil,
          required(:write_eligible) => boolean(),
          required(:applied_timezone) => String.t(),
          required(:targets) => EasyWeb.Types.Nutrition.NutritionDayTargets.t(),
          required(:summary) => EasyWeb.Types.Nutrition.NutritionDaySummary.t(),
          required(:slots) => [EasyWeb.Types.Nutrition.NutritionDaySlot.t()]
        }

  @type list_query :: %{
          optional(:date) => Date.t(),
          optional(:from) => Date.t(),
          optional(:to) => Date.t()
        }

  @type save :: %{required(:slots) => [EasyWeb.Types.Nutrition.DaySlotInput.t()]}
end
