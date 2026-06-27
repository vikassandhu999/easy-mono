defmodule EasyWeb.Clients.NutritionPlanJSON do
  alias Easy.MacroCalc
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.ScheduleEntry
  alias Easy.Nutrition.Recipe

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &summary_data/1), count: count}
  end

  @spec today(map()) :: map()
  def today(%{plan: plan, plan_items: plan_items, date: date, day: day}) do
    meals =
      Enum.map(plan_items, fn pi ->
        %{
          meal_slot: pi.meal_slot,
          meal_id: pi.nutrition_meal_id,
          meal_name: if(Ecto.assoc_loaded?(pi.meal), do: pi.meal.name, else: nil),
          items: today_meal_items(pi)
        }
      end)

    %{
      data: %{
        date: date,
        day: day,
        plan_id: plan.id,
        meals: meals
      }
    }
  end

  defp today_meal_items(%ScheduleEntry{meal: %Meal{meal_items: items}}) when is_list(items) do
    Enum.map(items, &today_item_data/1)
  end

  defp today_meal_items(_), do: []

  defp today_item_data(%MealItem{} = item) do
    {food_name, nutrition} =
      case {item.food, item.recipe} do
        {%Food{} = f, _} ->
          {f.name,
           %{
             calories_per_100g: f.calories_per_100g,
             protein_g_per_100g: f.protein_g_per_100g,
             carbs_g_per_100g: f.carbs_g_per_100g,
             fat_g_per_100g: f.fat_g_per_100g,
             fiber_g_per_100g: f.fiber_g_per_100g
           }}

        {_, %Recipe{} = r} ->
          {r.name, MacroCalc.recipe_totals(r)}

        _ ->
          {nil, nil}
      end

    %{
      meal_item_id: item.id,
      position: item.position,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      food_name: food_name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g,
      nutrition: nutrition
    }
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
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp data(%Plan{} = plan) do
    summary_data(plan)
    |> Map.merge(%{
      meals: meals_data(plan.meals),
      schedule_entries: schedule_entries_data(plan.plan_items)
    })
  end

  defp meals_data(meals) when is_list(meals), do: Enum.map(meals, &meal_data/1)
  defp meals_data(_), do: []

  defp meal_data(%Meal{} = meal) do
    %{
      id: meal.id,
      name: meal.name,
      notes: meal.notes,
      default_meal_slot: meal.default_meal_slot,
      nutrition: MacroCalc.meal_totals(meal.meal_items),
      meal_items: meal_items_data(meal.meal_items),
      inserted_at: meal.inserted_at,
      updated_at: meal.updated_at
    }
  end

  defp meal_items_data(items) when is_list(items), do: Enum.map(items, &meal_item_data/1)
  defp meal_items_data(_), do: []

  defp meal_item_data(%MealItem{} = item) do
    %{
      id: item.id,
      weight_g: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      position: item.position,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      food: food_data(item.food),
      recipe: recipe_data(item.recipe),
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
    }
  end

  defp food_data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_g_per_100g: food.protein_g_per_100g,
      carbs_g_per_100g: food.carbs_g_per_100g,
      fat_g_per_100g: food.fat_g_per_100g,
      fiber_g_per_100g: food.fiber_g_per_100g,
      serving_sizes: serving_sizes_data(food.serving_sizes)
    }
  end

  defp food_data(_), do: nil

  defp recipe_data(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      nutrition: MacroCalc.recipe_totals(recipe),
      serving_sizes: serving_sizes_data(recipe.serving_sizes)
    }
  end

  defp recipe_data(_), do: nil

  defp serving_sizes_data(sizes) when is_list(sizes) do
    for s <- sizes do
      %{
        label: s.label,
        amount: s.amount,
        unit: s.unit,
        weight_g: s.weight_g,
        is_default: s.is_default
      }
    end
  end

  defp serving_sizes_data(_), do: []

  defp schedule_entries_data(items) when is_list(items), do: Enum.map(items, &schedule_entry_data/1)
  defp schedule_entries_data(_), do: []

  defp schedule_entry_data(%ScheduleEntry{} = item) do
    %{
      id: item.id,
      day_of_week: item.day_of_week,
      meal_slot: item.meal_slot,
      nutrition_meal_id: item.nutrition_meal_id,
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
    }
  end
end
