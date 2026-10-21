defmodule EasyWeb.Types.Nutrition.Nutrient do
  use EasyWeb.Type
  @type t :: %{required(:code) => String.t(), required(:name) => String.t(), required(:unit) => String.t()}
  @type index :: %{required(:data) => [EasyWeb.Types.Nutrition.Nutrient.t()]}
end

defmodule EasyWeb.Types.Nutrition.NutrientMap do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => number()}
end

defmodule EasyWeb.Types.Nutrition.NutrientTarget do
  use EasyWeb.Type
  @type t :: %{optional(:min) => number(), optional(:max) => number()}
end

defmodule EasyWeb.Types.Nutrition.TargetBounds do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.Nutrition.NutrientTarget.t()}
end

defmodule EasyWeb.Types.Nutrition.NutrientTotal do
  use EasyWeb.Type

  @type t :: %{
          required(:value) => number() | nil,
          required(:known_entries) => non_neg_integer(),
          required(:total_entries) => non_neg_integer(),
          required(:incomplete) => boolean()
        }
end

defmodule EasyWeb.Types.Nutrition.NutrientTotals do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.Nutrition.NutrientTotal.t()}
end

defmodule EasyWeb.Types.Nutrition.FoodServing do
  use EasyWeb.Type
  @type t :: %{required(:label) => String.t(), required(:amount) => number()}
end

defmodule EasyWeb.Types.Nutrition.Food do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:kind) => :food | :supplement,
          required(:basis) => :"100g" | :"100ml" | :"1unit",
          required(:unit_label) => String.t() | nil,
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          required(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:kind) => :food | :supplement,
          required(:basis) => :"100g" | :"100ml" | :"1unit",
          optional(:unit_label) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          optional(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()]
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:kind) => :food | :supplement,
          optional(:basis) => :"100g" | :"100ml" | :"1unit",
          optional(:unit_label) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          optional(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()]
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:kind) => :food | :supplement,
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
end

defmodule EasyWeb.Types.Nutrition.FoodIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Nutrition.Food.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.MealItem do
  use EasyWeb.Type
  alias Easy.Nutrition.{Food, Values}

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:food_id) => Ecto.UUID.t(),
          required(:amount) => number(),
          required(:unit) => String.t(),
          required(:position) => non_neg_integer(),
          required(:food) => EasyWeb.Types.Nutrition.Food.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t()
        }
  @type create :: %{required(:food_id) => Ecto.UUID.t(), required(:amount) => number(), required(:unit) => String.t()}
  @spec format(Easy.Nutrition.MealItem.t()) :: t()
  def format(row),
    do: row |> Map.take([:id, :food_id, :amount, :unit, :position, :food]) |> Map.put(:nutrients, nutrients(row))

  @spec nutrients(map()) :: map()
  def nutrients(row) do
    case Food.factor(row.food, row.amount, row.unit) do
      {:ok, factor} -> Values.scale(row.food.nutrients, factor)
      {:error, :invalid_unit} -> %{}
    end
  end
end

defmodule EasyWeb.Types.Nutrition.MealOption do
  use EasyWeb.Type
  alias Easy.Nutrition.Values
  alias EasyWeb.Types.Nutrition.MealItem

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:items) => [MealItem.t()],
          required(:totals) => EasyWeb.Types.Nutrition.NutrientTotals.t()
        }
  @type create :: %{optional(:name) => String.t() | nil, required(:items) => [MealItem.create()]}
  @spec format(Easy.Nutrition.MealOption.t()) :: t()
  def format(row),
    do:
      row
      |> Map.take([:id, :name, :position, :items])
      |> Map.put(:totals, Values.totals(Enum.map(row.items, &MealItem.nutrients/1)))
end

defmodule EasyWeb.Types.Nutrition.NutritionPreset do
  use EasyWeb.Type
  alias Easy.Nutrition.Values
  alias EasyWeb.Types.Nutrition.MealItem

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:type) => :meal | :food | :supplement,
          required(:name) => String.t() | nil,
          required(:instructions) => String.t() | nil,
          required(:food_id) => Ecto.UUID.t() | nil,
          required(:amount) => number() | nil,
          required(:unit) => String.t() | nil,
          required(:food) => EasyWeb.Types.Nutrition.Food.t() | nil,
          required(:options) => [EasyWeb.Types.Nutrition.MealOption.t()],
          required(:totals) => EasyWeb.Types.Nutrition.NutrientTotals.t() | nil
        }
  @type create :: %{
          required(:type) => :meal | :food | :supplement,
          optional(:name) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:food_id) => Ecto.UUID.t() | nil,
          optional(:amount) => number() | nil,
          optional(:unit) => String.t() | nil,
          optional(:options) => [EasyWeb.Types.Nutrition.MealOption.create()]
        }
  @type update :: %{
          optional(:type) => :meal | :food | :supplement,
          optional(:name) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:food_id) => Ecto.UUID.t() | nil,
          optional(:amount) => number() | nil,
          optional(:unit) => String.t() | nil,
          optional(:options) => [EasyWeb.Types.Nutrition.MealOption.create()]
        }
  @type mutation :: %{
          required(:data) => EasyWeb.Types.Nutrition.NutritionPreset.t(),
          required(:undo_token) => String.t()
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:type) => :meal | :food | :supplement,
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
  @spec format(Easy.Nutrition.NutritionPreset.t()) :: t()
  def format(row) do
    total = if row.type == :meal, do: nil, else: Values.totals([MealItem.nutrients(row)])

    row
    |> Map.take([:id, :type, :name, :instructions, :food_id, :amount, :unit, :food, :options])
    |> Map.put(:totals, total)
  end
end

defmodule EasyWeb.Types.Nutrition.NutritionPresetIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Nutrition.NutritionPreset.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:nutrition_preset_id) => Ecto.UUID.t(),
          required(:date) => Date.t() | nil,
          required(:weekdays_mask) => pos_integer() | nil,
          required(:from_date) => Date.t() | nil,
          required(:until_date) => Date.t() | nil,
          required(:time) => String.t() | nil,
          required(:coach_id) => Ecto.UUID.t() | nil
        }
  @type create :: %{
          optional(:nutrition_preset_id) => Ecto.UUID.t(),
          optional(:preset) => EasyWeb.Types.Nutrition.NutritionPreset.create(),
          required(:weekdays_mask) => pos_integer(),
          optional(:time) => String.t() | nil
        }
  @type update :: %{
          optional(:nutrition_preset_id) => Ecto.UUID.t(),
          optional(:weekdays_mask) => pos_integer(),
          optional(:time) => String.t() | nil,
          optional(:amount) => number(),
          optional(:unit) => String.t()
        }
  @type mutation :: %{
          required(:data) => EasyWeb.Types.Nutrition.NutritionSchedule.t(),
          required(:undo_token) => String.t()
        }
  @type remove_query :: %{optional(:weekday) => pos_integer()}
  @spec format(Easy.Nutrition.NutritionSchedule.t()) :: t()
  def format(row) do
    time = if row.time, do: row.time |> Time.to_iso8601() |> String.slice(0, 5), else: nil

    row
    |> Map.take([:id, :nutrition_preset_id, :date, :weekdays_mask, :from_date, :until_date, :coach_id])
    |> Map.put(:time, time)
  end
end

defmodule EasyWeb.Types.Nutrition.NutritionTargets do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:targets) => EasyWeb.Types.Nutrition.TargetBounds.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:targets) => EasyWeb.Types.Nutrition.TargetBounds.t(),
          optional(:weekdays_mask) => pos_integer()
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:targets) => EasyWeb.Types.Nutrition.TargetBounds.t(),
          optional(:copy_for_day) => pos_integer()
        }
  @type mutation :: %{
          required(:data) => EasyWeb.Types.Nutrition.NutritionTargets.t(),
          required(:undo_token) => String.t()
        }
  @type edit :: %{
          required(:id) => Ecto.UUID.t(),
          optional(:name) => String.t(),
          required(:targets) => EasyWeb.Types.Nutrition.TargetBounds.t()
        }
  @type new :: %{required(:name) => String.t(), required(:targets) => EasyWeb.Types.Nutrition.TargetBounds.t()}
  @type assign :: %{
          required(:nutrition_targets_id) => Ecto.UUID.t() | nil,
          optional(:target_updates) => [EasyWeb.Types.Nutrition.NutritionTargets.edit()],
          optional(:new_targets) => EasyWeb.Types.Nutrition.NutritionTargets.new()
        }
end

defmodule EasyWeb.Types.Nutrition.TargetSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:nutrition_targets_id) => Ecto.UUID.t(),
          required(:date) => Date.t() | nil,
          required(:weekdays_mask) => pos_integer() | nil,
          required(:from_date) => Date.t() | nil,
          required(:until_date) => Date.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionWeek do
  use EasyWeb.Type

  @type t :: %{
          required(:today) => Date.t(),
          required(:nutrients) => [EasyWeb.Types.Nutrition.Nutrient.t()],
          required(:presets) => [EasyWeb.Types.Nutrition.NutritionPreset.t()],
          required(:schedules) => [EasyWeb.Types.Nutrition.NutritionSchedule.t()],
          required(:nutrition_targets) => [EasyWeb.Types.Nutrition.NutritionTargets.t()],
          required(:target_schedules) => [EasyWeb.Types.Nutrition.TargetSchedule.t()]
        }
  @type query :: %{optional(:on) => Date.t()}
  @type mutation :: %{required(:data) => EasyWeb.Types.Nutrition.NutritionWeek.t(), required(:undo_token) => String.t()}
  @type undo :: %{required(:token) => String.t()}
end
