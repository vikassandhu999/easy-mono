defmodule EasyWeb.Types.Nutrition.NutrientMap do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => number()}
end

defmodule EasyWeb.Types.Nutrition.NutrientTarget do
  use EasyWeb.Type
  @type t :: %{optional(:min) => number(), optional(:max) => number()}
end

defmodule EasyWeb.Types.Nutrition.NutritionTargets do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.Nutrition.NutrientTarget.t()}
end

defmodule EasyWeb.Types.Nutrition.NutritionSource do
  use EasyWeb.Type
  @type t :: %{required(:type) => :food | :recipe, required(:id) => Ecto.UUID.t()}
end

defmodule EasyWeb.Types.Nutrition.NutritionPortion do
  use EasyWeb.Type

  @type t ::
          %{required(:type) => :grams, required(:grams) => number()}
          | %{required(:type) => :serving, required(:serving_id) => String.t(), required(:amount) => number()}
end

defmodule EasyWeb.Types.NutritionMealItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:source) => EasyWeb.Types.Nutrition.NutritionSource.t(),
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          optional(:name) => String.t(),
          optional(:grams) => number(),
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t()
        }
end

defmodule EasyWeb.Types.NutritionMeal do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:items) => [EasyWeb.Types.NutritionMealItem.t()]
        }
end

defmodule EasyWeb.Types.NutritionPatternSlot do
  use EasyWeb.Type
  @type t :: %{required(:id) => Ecto.UUID.t(), required(:name) => String.t(), required(:meal_ids) => [Ecto.UUID.t()]}
end

defmodule EasyWeb.Types.NutritionDayPattern do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          optional(:targets) => EasyWeb.Types.Nutrition.NutritionTargets.t(),
          required(:slots) => [EasyWeb.Types.NutritionPatternSlot.t()]
        }
end

defmodule EasyWeb.Types.NutritionContent do
  use EasyWeb.Type

  @type t :: %{
          required(:targets) => EasyWeb.Types.Nutrition.NutritionTargets.t(),
          required(:meals) => [EasyWeb.Types.NutritionMeal.t()],
          required(:day_patterns) => [EasyWeb.Types.NutritionDayPattern.t()],
          required(:schedule) => EasyWeb.Types.TrainingSchedule.t()
        }
end
