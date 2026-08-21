defmodule EasyWeb.Coaches.NutritionPlanJSON do
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

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &data/1), count: count}
  end

  defp data(%Plan{} = plan) do
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
      client: client_data(plan.client),
      creator_id: plan.creator_id,
      source_template_id: plan.source_template_id,
      meals: meals_data(plan.meals),
      day_patterns: day_patterns_data(plan.day_patterns, plan.week_schedule),
      schedule: schedule_data(plan.week_schedule),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp meals_data(meals) when is_list(meals), do: Enum.map(meals, &meal_data/1)
  defp meals_data(_), do: []

  defp meal_data(%Meal{} = meal) do
    items = if is_list(meal.meal_items), do: meal.meal_items, else: []

    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      position: meal.position,
      nutrition_plan_id: meal.nutrition_plan_id,
      nutrients: NutrientTotals.round(NutrientTotals.sum(items)),
      meal_items: meal_items_data(items),
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  defp meal_items_data(items) when is_list(items), do: Enum.map(items, &meal_item_data/1)
  defp meal_items_data(_), do: []

  defp meal_item_data(%MealItem{} = item) do
    %{
      id: item.id,
      kind: item_kind(item),
      name: item_name(item),
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: portion_data(item),
      nutrients: NutrientTotals.round(NutrientTotals.from_fields(item)),
      nutrition_meal_id: item.nutrition_meal_id,
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
    }
  end

  defp item_kind(%MealItem{food_id: food_id}) when not is_nil(food_id), do: :food
  defp item_kind(%MealItem{}), do: :recipe

  defp item_name(%MealItem{food: %Food{name: name}}), do: name
  defp item_name(%MealItem{recipe: %Recipe{name: name}}), do: name
  defp item_name(_item), do: nil

  defp portion_data(%MealItem{} = item) do
    %{
      kind: item.portion_kind,
      grams: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      label: item.serving_label
    }
  end

  defp day_patterns_data(patterns, schedule) when is_list(patterns) and is_list(schedule),
    do: Enum.map(patterns, &day_pattern_data(&1, schedule))

  defp day_patterns_data(_, _), do: []

  defp schedule_data(schedule) when is_list(schedule) do
    scheduled =
      Map.new(schedule, fn %WeekSchedule{} = row ->
        {Atom.to_string(row.weekday), row.nutrition_day_pattern_id}
      end)

    Map.new(WeekSchedule.weekdays(), fn weekday -> {Atom.to_string(weekday), scheduled[Atom.to_string(weekday)]} end)
  end

  defp schedule_data(_), do: Map.new(WeekSchedule.weekdays(), &{Atom.to_string(&1), nil})

  defp day_pattern_data(%DayPattern{} = pattern, schedule) do
    %{
      id: pattern.id,
      name: pattern.name,
      position: pattern.position,
      weekdays: DayPattern.weekdays_for(pattern, schedule),
      slots: slots_data(pattern.meal_options),
      nutrition_plan_id: pattern.nutrition_plan_id,
      inserted_at: pattern.inserted_at,
      updated_at: pattern.updated_at
    }
  end

  defp slots_data(options) when is_list(options) do
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
          |> Enum.map(&option_data/1)
      }
    end)
  end

  defp slots_data(_), do: []

  defp option_data(%MealOption{} = option) do
    %{
      id: option.id,
      position: option.position,
      nutrition_meal_id: option.nutrition_meal_id,
      inserted_at: option.inserted_at,
      updated_at: option.updated_at
    }
  end

  defp client_data(%Client{} = client) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name}
  end

  defp client_data(_), do: nil
end
