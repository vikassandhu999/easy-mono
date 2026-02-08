defmodule EasyWeb.Coaches.NutritionPlanJSON do
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem

  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &data/1), count: count}
  end

  def shopping_list(%{items: items}) do
    %{data: items}
  end

  def macros(%{macros: macros}) do
    %{data: macros}
  end

  def plan_items(%{plan_items: plan_items}) do
    %{data: Enum.map(plan_items, &plan_item_data/1)}
  end

  def meals(%{meals: meals}) do
    %{data: Enum.map(meals, &meal_data/1)}
  end

  defp data(%Plan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      tags: plan.tags || [],
      macros_goal: plan.macros_goal,
      type: plan.type,
      status: plan.status,
      client_id: plan.client_id,
      source_template_id: plan.source_template_id,
      meals: meals_data(plan.meals),
      plan_items: plan_items_data(plan.plan_items),
      creator_id: plan.creator_id,
      business_id: plan.business_id,
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp meals_data(meals) when is_list(meals) do
    Enum.map(meals, &meal_data/1)
  end

  defp meals_data(_), do: []

  defp meal_data(%Meal{} = meal) do
    %{
      id: meal.id,
      name: meal.name,
      macros: meal.macros,
      position: meal.position,
      meal_items: meal_items_data(meal.meal_items),
      creator_id: meal.creator_id,
      business_id: meal.business_id,
      plan_id: meal.plan_id,
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
      meal_id: meal_item.meal_id,
      business_id: meal_item.business_id,
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
      day: plan_item.day,
      meal_type: plan_item.meal_type,
      meal_id: plan_item.meal_id,
      plan_id: plan_item.plan_id,
      creator_id: plan_item.creator_id,
      business_id: plan_item.business_id,
      inserted_at: plan_item.inserted_at,
      updated_at: plan_item.updated_at
    }
  end

  defp plan_item_data(_), do: nil
end
