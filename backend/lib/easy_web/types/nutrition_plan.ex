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

defmodule EasyWeb.Types.NutritionMealOption do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:nutrition_meal_id) => String.t()
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
          required(:slots) => [EasyWeb.Types.NutritionDayPatternSlot.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionPortion do
  use EasyWeb.Type

  @type t ::
          %{required(:kind) => :gram, required(:grams) => float()}
          | %{
              required(:kind) => :serving,
              required(:amount) => float(),
              required(:unit) => String.t(),
              required(:label) => String.t() | nil
            }
end

defmodule EasyWeb.Types.NutritionMealItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :food | :recipe,
          optional(:name) => String.t() | nil,
          optional(:food_id) => String.t() | nil,
          optional(:recipe_id) => String.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          optional(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t()
        }
end

defmodule EasyWeb.Types.NutritionMeal do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:meal_items) => [EasyWeb.Types.NutritionMealItem.t()]
        }
end

defmodule EasyWeb.Types.NutritionMenu do
  use EasyWeb.Type

  # Array order is authoritative. Names on items and nutrient totals are
  # server-calculated: accepted on save for round trips, never trusted.
  @type t :: %{
          required(:meals) => [EasyWeb.Types.NutritionMeal.t()],
          required(:day_patterns) => [EasyWeb.Types.NutritionDayPattern.t()],
          required(:schedule) => EasyWeb.Types.NutritionWeekSchedule.t()
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
    Portions,
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
          required(:menu) => EasyWeb.Types.NutritionMenu.t(),
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
          required(:menu) => EasyWeb.Types.NutritionMenu.t()
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
      menu: %{
        meals: Enum.map(meals, &format_meal/1),
        day_patterns: Enum.map(patterns, &format_day_pattern/1),
        schedule: format_schedule(schedule)
      },
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp format_meal(%Meal{meal_items: items} = meal) when is_list(items) do
    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      nutrients: items |> NutrientTotals.sum() |> NutrientTotals.round(),
      meal_items: Enum.map(items, &format_meal_item/1)
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
      portion: Portions.from_snapshot(item),
      nutrients: item |> NutrientTotals.from_fields() |> NutrientTotals.round()
    }
  end

  defp format_day_pattern(%DayPattern{meal_options: options} = pattern)
       when is_list(options) do
    %{
      id: pattern.id,
      name: pattern.name,
      slots: format_slots(options)
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
      nutrition_meal_id: option.nutrition_meal_id
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

defmodule EasyWeb.Types.NutritionCoverage do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:current) => EasyWeb.Types.NutritionPlan.t() | nil,
          required(:upcoming) => [EasyWeb.Types.NutritionPlan.t()]
        }
end
