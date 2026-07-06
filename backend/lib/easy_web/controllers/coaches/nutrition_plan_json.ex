defmodule EasyWeb.Coaches.NutritionPlanJSON do
  alias Easy.Clients.Client
  alias Easy.MacroCalc
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &summary_data/1), count: count}
  end

  defp summary_data(%Plan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      tags: plan.tags || [],
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      target_fiber_g: plan.target_fiber_g,
      status: plan.status,
      start_date: plan.start_date,
      end_date: plan.end_date,
      client_id: plan.client_id,
      client: client_data(plan.client),
      source_template_id: plan.source_template_id,
      creator_id: plan.creator_id,
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp data(%Plan{} = plan) do
    summary_data(plan)
    |> Map.merge(%{
      meals: meals_data(plan.meals),
      days: days_data(plan.days),
      weekday_assignments: assignments_data(plan.weekday_assignments)
    })
  end

  defp days_data(days) when is_list(days), do: Enum.map(days, &day_data/1)
  defp days_data(_), do: []

  defp day_data(day) do
    %{
      id: day.id,
      name: day.name,
      position: day.position,
      day_meals:
        Enum.map(day.day_meals, fn dm ->
          %{id: dm.id, meal_slot: dm.meal_slot, position: dm.position, nutrition_meal_id: dm.nutrition_meal_id}
        end)
    }
  end

  defp assignments_data(assignments) when is_list(assignments) do
    Map.new(assignments, fn wa -> {to_string(wa.day_of_week), wa.nutrition_plan_day_id} end)
  end

  defp assignments_data(_), do: %{}

  defp meals_data(meals) when is_list(meals) do
    Enum.map(meals, &meal_data/1)
  end

  defp meals_data(_), do: []

  defp meal_data(%Meal{} = meal) do
    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      default_meal_slot: meal.default_meal_slot,
      nutrition: MacroCalc.meal_totals(meal.meal_items),
      meal_items: meal_items_data(meal.meal_items),
      creator_id: meal.creator_id,
      nutrition_plan_id: meal.nutrition_plan_id,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  defp meal_data(_), do: nil

  defp meal_items_data(meal_items) when is_list(meal_items) do
    Enum.map(meal_items, &meal_item_data/1)
  end

  defp meal_items_data(_), do: []

  defp meal_item_data(%MealItem{} = meal_item) do
    %{
      id: meal_item.id,
      name: meal_item_name(meal_item),
      weight_g: meal_item.weight_g,
      amount: meal_item.amount,
      unit: meal_item.unit,
      position: meal_item.position,
      recipe_id: meal_item.recipe_id,
      food_id: meal_item.food_id,
      nutrition_meal_id: meal_item.nutrition_meal_id,
      nutrition: MacroCalc.for_meal_item(meal_item),
      inserted_at: meal_item.inserted_at,
      updated_at: meal_item.updated_at
    }
  end

  defp meal_item_data(_), do: nil

  defp meal_item_name(%MealItem{food: %{name: name}}), do: name
  defp meal_item_name(%MealItem{recipe: %{name: name}}), do: name
  defp meal_item_name(_), do: nil

  defp client_data(%Client{} = client) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name
    }
  end

  defp client_data(_), do: nil
end
