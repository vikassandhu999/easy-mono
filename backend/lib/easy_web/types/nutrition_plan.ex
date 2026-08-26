defmodule EasyWeb.Types.NutritionPlanClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionWeekSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:monday) => String.t() | nil,
          required(:tuesday) => String.t() | nil,
          required(:wednesday) => String.t() | nil,
          required(:thursday) => String.t() | nil,
          required(:friday) => String.t() | nil,
          required(:saturday) => String.t() | nil,
          required(:sunday) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionWeekScheduleInput do
  use EasyWeb.Type

  @type t :: %{
          required(:monday) => String.t(),
          required(:tuesday) => String.t(),
          required(:wednesday) => String.t(),
          required(:thursday) => String.t(),
          required(:friday) => String.t(),
          required(:saturday) => String.t(),
          required(:sunday) => String.t()
        }
end

defmodule EasyWeb.Types.NutritionMealOption do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:position) => non_neg_integer(),
          required(:nutrition_meal_id) => String.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.NutritionDayPatternSlot do
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
          required(:options) => [EasyWeb.Types.NutritionMealOption.t()]
        }
end

defmodule EasyWeb.Types.NutritionDayPattern do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:position) => non_neg_integer(),
          required(:weekdays) => [
            :monday | :tuesday | :wednesday | :thursday | :friday | :saturday | :sunday
          ],
          required(:slots) => [EasyWeb.Types.NutritionDayPatternSlot.t()],
          required(:nutrition_plan_id) => String.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionPortion do
  use EasyWeb.Type

  @type t :: %{
          required(:kind) => :gram | :serving,
          required(:grams) => float() | nil,
          required(:amount) => float() | nil,
          required(:unit) => String.t() | nil,
          required(:label) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionPortionInput do
  use EasyWeb.Type

  @type t :: %{
          required(:kind) => :gram | :serving,
          optional(:grams) => float() | nil,
          optional(:amount) => float() | nil,
          optional(:unit) => String.t() | nil,
          optional(:label) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionMealItemInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:kind) => :food | :recipe,
          optional(:food_id) => String.t() | nil,
          optional(:recipe_id) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortionInput.t()
        }
end

defmodule EasyWeb.Types.NutritionMealInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:meal_items) => [EasyWeb.Types.NutritionMealItemInput.t()]
        }
end

defmodule EasyWeb.Types.NutritionMealOptionInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          optional(:nutrition_meal_id) => String.t(),
          optional(:meal_local_ref) => String.t(),
          required(:position) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.NutritionDayPatternSlotInput do
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
          required(:options) => [EasyWeb.Types.NutritionMealOptionInput.t()]
        }
end

defmodule EasyWeb.Types.NutritionDayPatternInput do
  use EasyWeb.Type

  @type t :: %{
          optional(:id) => String.t(),
          optional(:local_ref) => String.t(),
          required(:name) => String.t(),
          required(:position) => non_neg_integer(),
          required(:slots) => [EasyWeb.Types.NutritionDayPatternSlotInput.t()]
        }
end

defmodule EasyWeb.Types.NutritionMealItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :food | :recipe,
          required(:name) => String.t() | nil,
          required(:food_id) => String.t() | nil,
          required(:recipe_id) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:nutrition_meal_id) => String.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.NutritionMeal do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:notes) => String.t() | nil,
          required(:position) => non_neg_integer(),
          required(:nutrition_plan_id) => String.t(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:meal_items) => [EasyWeb.Types.NutritionMealItem.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.NutritionPlan do
  use EasyWeb.Type

  alias Easy.Clients.Client

  alias Easy.Nutrition.{
    DayPattern,
    Food,
    Meal,
    MealItem,
    MealOption,
    MealSlot,
    NutrientTotals,
    Plan,
    Recipe,
    WeekSchedule
  }

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :template | :client_plan,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:archived_at) => DateTime.t() | nil,
          required(:status) => :active | :archived,
          required(:lifecycle) => :incomplete | :upcoming | :current | :ended | :archived | nil,
          required(:assigned_client_count) => non_neg_integer(),
          required(:target_calories) => float() | nil,
          required(:target_protein_g) => float() | nil,
          required(:target_carbs_g) => float() | nil,
          required(:target_fat_g) => float() | nil,
          required(:target_fiber_g) => float() | nil,
          required(:start_date) => Date.t() | nil,
          required(:end_date) => Date.t() | nil,
          required(:client_id) => String.t() | nil,
          required(:client) => EasyWeb.Types.NutritionPlanClient.t() | nil,
          required(:creator_id) => String.t() | nil,
          required(:source_template_id) => String.t() | nil,
          required(:meals) => [EasyWeb.Types.NutritionMeal.t()],
          required(:day_patterns) => [EasyWeb.Types.NutritionDayPattern.t()],
          required(:schedule) => EasyWeb.Types.NutritionWeekSchedule.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:target_calories) => float() | nil,
          optional(:target_protein_g) => float() | nil,
          optional(:target_carbs_g) => float() | nil,
          optional(:target_fat_g) => float() | nil,
          optional(:target_fiber_g) => float() | nil
        }

  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:target_calories) => float() | nil,
          optional(:target_protein_g) => float() | nil,
          optional(:target_carbs_g) => float() | nil,
          optional(:target_fat_g) => float() | nil,
          optional(:target_fiber_g) => float() | nil,
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type assign :: %{
          required(:expected_revision) => pos_integer(),
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type replace_menu :: %{
          required(:expected_revision) => pos_integer(),
          required(:meals) => [EasyWeb.Types.NutritionMealInput.t()],
          required(:day_patterns) => [EasyWeb.Types.NutritionDayPatternInput.t()],
          required(:schedule) => EasyWeb.Types.NutritionWeekScheduleInput.t()
        }

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }

  @type client_list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:status) => :active | :archived
        }

  @spec format(Plan.t()) :: t()
  def format(%Plan{meals: meals, day_patterns: patterns, week_schedule: schedule} = plan)
      when is_list(meals) and is_list(patterns) and is_list(schedule) do
    %{
      id: plan.id,
      kind: plan.kind,
      name: plan.name,
      description: plan.description,
      revision: plan.revision,
      archived_at: plan.archived_at,
      status: if(plan.archived_at, do: :archived, else: :active),
      lifecycle: plan.lifecycle,
      assigned_client_count: plan.assigned_client_count || 0,
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      target_fiber_g: plan.target_fiber_g,
      start_date: plan.start_date,
      end_date: plan.end_date,
      client_id: plan.client_id,
      client: format_client(plan),
      creator_id: plan.creator_id,
      source_template_id: plan.source_template_id,
      meals: Enum.map(meals, &format_meal/1),
      day_patterns: Enum.map(patterns, &format_day_pattern(&1, schedule)),
      schedule: format_schedule(schedule),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp format_meal(%Meal{meal_items: items} = meal) when is_list(items) do
    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      position: meal.position,
      nutrition_plan_id: meal.nutrition_plan_id,
      nutrients: items |> NutrientTotals.sum() |> NutrientTotals.round(),
      meal_items: Enum.map(items, &format_meal_item/1),
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  defp format_meal_item(%MealItem{food_id: food_id, food: %Food{name: name}} = item)
       when not is_nil(food_id),
       do: format_meal_item(item, :food, name)

  defp format_meal_item(%MealItem{recipe_id: recipe_id, recipe: %Recipe{name: name}} = item)
       when not is_nil(recipe_id),
       do: format_meal_item(item, :recipe, name)

  defp format_meal_item(%MealItem{} = item, kind, name) do
    %{
      id: item.id,
      kind: kind,
      name: name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: %{
        kind: item.portion_kind,
        grams: item.weight_g,
        amount: item.amount,
        unit: item.unit,
        label: item.serving_label
      },
      nutrients: item |> NutrientTotals.from_fields() |> NutrientTotals.round(),
      nutrition_meal_id: item.nutrition_meal_id,
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
    }
  end

  defp format_day_pattern(%DayPattern{meal_options: options} = pattern, schedule)
       when is_list(options) do
    %{
      id: pattern.id,
      name: pattern.name,
      position: pattern.position,
      weekdays: DayPattern.weekdays_for(pattern, schedule),
      slots: format_slots(options),
      nutrition_plan_id: pattern.nutrition_plan_id,
      inserted_at: pattern.inserted_at,
      updated_at: pattern.updated_at
    }
  end

  defp format_slots(options) do
    grouped = Enum.group_by(options, & &1.meal_slot)

    MealSlot.values()
    |> Enum.filter(&Map.has_key?(grouped, &1))
    |> Enum.map(fn slot ->
      %{
        meal_slot: slot,
        options:
          grouped
          |> Map.fetch!(slot)
          |> Enum.sort_by(&{&1.position, &1.id})
          |> Enum.map(&format_option/1)
      }
    end)
  end

  defp format_option(%MealOption{} = option) do
    %{
      id: option.id,
      position: option.position,
      nutrition_meal_id: option.nutrition_meal_id,
      inserted_at: option.inserted_at,
      updated_at: option.updated_at
    }
  end

  defp format_schedule(schedule) do
    scheduled =
      Map.new(schedule, fn %WeekSchedule{} = row ->
        {row.weekday, row.nutrition_day_pattern_id}
      end)

    Map.new(WeekSchedule.weekdays(), fn weekday ->
      {weekday, scheduled[weekday]}
    end)
  end

  defp format_client(%Plan{kind: :template}), do: nil

  defp format_client(%Plan{kind: :client_plan, client: %Client{} = client}) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name}
  end
end
