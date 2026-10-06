defmodule EasyWeb.Types.Nutrition.NutrientTotals do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.Nutrition.NutrientTotal.t()}
end

defmodule EasyWeb.Types.Nutrition.NutrientTotal do
  use EasyWeb.Type

  @type t :: %{
          required(:value) => number() | nil,
          required(:known_entries) => non_neg_integer(),
          required(:total_entries) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.Nutrition.DiaryEntry do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:planned_item_id) => Ecto.UUID.t() | nil,
          required(:source) => EasyWeb.Types.Nutrition.NutritionSource.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t() | nil,
          required(:name) => String.t(),
          required(:grams) => number() | nil,
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          required(:notes) => String.t() | nil,
          required(:request_id) => Ecto.UUID.t()
        }
end

defmodule EasyWeb.Types.Nutrition.DiaryMeal do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:local_date) => Date.t(),
          required(:timezone) => String.t(),
          required(:plan_revision_id) => Ecto.UUID.t() | nil,
          required(:slot_id) => Ecto.UUID.t() | nil,
          required(:name) => String.t(),
          required(:chosen_meal_id) => Ecto.UUID.t() | nil,
          required(:note_to_coach) => String.t() | nil,
          required(:shared_at) => DateTime.t() | nil,
          required(:revision) => pos_integer(),
          required(:request_id) => Ecto.UUID.t(),
          required(:entries) => [EasyWeb.Types.Nutrition.DiaryEntry.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionSlot do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:plan_revision_id) => Ecto.UUID.t(),
          required(:options) => [EasyWeb.Types.NutritionMeal.t()],
          required(:meal) => EasyWeb.Types.Nutrition.DiaryMeal.t() | nil,
          required(:status) => :recorded | :not_recorded
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionDay do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:timezone) => String.t(),
          required(:write_eligible) => boolean(),
          required(:plan_id) => Ecto.UUID.t() | nil,
          required(:plan_revision_id) => Ecto.UUID.t() | nil,
          required(:plan_revision_number) => pos_integer() | nil,
          required(:targets) => EasyWeb.Types.Nutrition.NutritionTargets.t(),
          required(:target_changed) => boolean(),
          required(:totals) => EasyWeb.Types.Nutrition.NutrientTotals.t(),
          required(:counts) => %{required(:expected) => non_neg_integer(), required(:recorded) => non_neg_integer()},
          required(:slots) => [EasyWeb.Types.Nutrition.NutritionSlot.t()],
          required(:extra_meals) => [EasyWeb.Types.Nutrition.DiaryMeal.t()]
        }
  @type list_query :: %{optional(:date) => Date.t(), optional(:from) => Date.t(), optional(:to) => Date.t()}
  @type save :: %{required(:meals) => [EasyWeb.Types.Nutrition.DiaryMealInput.t()]}
end

defmodule EasyWeb.Types.Nutrition.FoodMetric do
  use EasyWeb.Type

  @type t :: %{
          required(:food_id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:entries_count) => non_neg_integer(),
          required(:days_count) => non_neg_integer(),
          required(:average_grams) => number(),
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientTotals.t()
        }
end

defmodule EasyWeb.Types.Nutrition.DiaryEntryInput do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:planned_item_id) => Ecto.UUID.t() | nil,
          required(:source) => EasyWeb.Types.Nutrition.NutritionSource.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t() | nil,
          optional(:name) => String.t(),
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          optional(:notes) => String.t() | nil,
          required(:request_id) => Ecto.UUID.t()
        }
end

defmodule EasyWeb.Types.Nutrition.DiaryMealInput do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:plan_revision_id) => Ecto.UUID.t() | nil,
          required(:slot_id) => Ecto.UUID.t() | nil,
          required(:name) => String.t(),
          required(:chosen_meal_id) => Ecto.UUID.t() | nil,
          optional(:note_to_coach) => String.t() | nil,
          required(:request_id) => Ecto.UUID.t(),
          required(:entries) => [EasyWeb.Types.Nutrition.DiaryEntryInput.t()],
          required(:expected_revision) => non_neg_integer(),
          optional(:share) => boolean()
        }
end
