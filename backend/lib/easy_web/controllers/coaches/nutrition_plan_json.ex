defmodule EasyWeb.Coaches.NutritionPlanJSON do
  alias Easy.Clients.Client
  alias Easy.MacroCalc
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &summary_data/1), count: count}
  end

  @spec plan_items(map()) :: map()
  def plan_items(%{plan_items: plan_items}) do
    %{data: Enum.map(plan_items, &plan_item_data/1)}
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
      plan_items: plan_items_data(plan.plan_items)
    })
  end

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
      weight_g: meal_item.weight_g,
      amount: meal_item.amount,
      unit: meal_item.unit,
      position: meal_item.position,
      recipe_id: meal_item.recipe_id,
      food_id: meal_item.food_id,
      nutrition_meal_id: meal_item.nutrition_meal_id,
      inserted_at: meal_item.inserted_at,
      updated_at: meal_item.updated_at
    }
  end

  defp meal_item_data(_), do: nil

  defp plan_items_data(plan_items) when is_list(plan_items) do
    Enum.map(plan_items, &plan_item_data/1)
  end

  defp plan_items_data(_), do: []

  defp plan_item_data(%PlanItem{} = plan_item) do
    %{
      id: plan_item.id,
      day_of_week: plan_item.day_of_week,
      meal_slot: plan_item.meal_slot,
      nutrition_meal_id: plan_item.nutrition_meal_id,
      nutrition_plan_id: plan_item.nutrition_plan_id,
      inserted_at: plan_item.inserted_at,
      updated_at: plan_item.updated_at
    }
  end

  defp plan_item_data(_), do: nil

  defp client_data(%Client{} = client) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name
    }
  end

  defp client_data(_), do: nil
end
