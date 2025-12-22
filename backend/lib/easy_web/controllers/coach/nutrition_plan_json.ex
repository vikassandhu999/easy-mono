defmodule EasyWeb.Coach.NutritionPlanJSON do
  alias Ecto.Association.NotLoaded
  alias Easy.Nutrition.NutritionPlan

  def index(%{nutrition_plans: plans, meta: meta}) do
    %{
      data: Enum.map(plans, &render_plan/1),
      meta: meta
    }
  end

  def show(%{nutrition_plan: plan}) do
    %{data: render_plan(plan)}
  end

  def create(assigns), do: show(assigns)
  def update(assigns), do: show(assigns)

  defp render_plan(%NutritionPlan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      thumbnail_url: plan.thumbnail_url,
      is_template: plan.is_template,
      status: plan.status,
      start_date: plan.start_date,
      end_date: plan.end_date,
      tags: plan.tags,
      client_id: plan.client_id,
      original_template_id: plan.original_template_id,
      business_id: plan.business_id,
      author_id: plan.author_id,
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
    |> maybe_put_meals(plan.meals)
  end

  defp maybe_put_meals(output, %NotLoaded{}), do: output
  defp maybe_put_meals(output, nil), do: output

  defp maybe_put_meals(output, meals) when is_list(meals) do
    Map.put(output, :meals, Enum.map(meals, &render_meal/1))
  end

  defp render_meal(meal) do
    %{
      id: meal.id,
      day_number: meal.day_number,
      daytime: meal.daytime,
      label: meal.label,
      time: meal.time,
      notes: meal.notes,
      position: meal.position,
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
    |> maybe_put_meal_items(meal.meal_items)
  end

  defp maybe_put_meal_items(output, %NotLoaded{}), do: output
  defp maybe_put_meal_items(output, nil), do: output

  defp maybe_put_meal_items(output, meal_items) when is_list(meal_items) do
    Map.put(output, :meal_items, Enum.map(meal_items, &render_meal_item/1))
  end

  defp render_meal_item(meal_item) do
    %{
      id: meal_item.id,
      position: meal_item.position,
      servings: meal_item.servings,
      recipe_id: meal_item.recipe_id,
      recipe: render_nested_recipe(meal_item.recipe)
    }
  end

  defp render_nested_recipe(%NotLoaded{}), do: nil
  defp render_nested_recipe(nil), do: nil

  defp render_nested_recipe(recipe) do
    %{
      id: recipe.id,
      name: recipe.name
    }
  end
end
