defmodule EasyWeb.Clients.NutritionPlanJSON do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
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
  def today(%{plan: plan, plan_items: plan_items, date: date, day: day} = assigns) do
    meals =
      Enum.map(plan_items, fn pi ->
        %{
          meal_slot: pi.meal_type,
          meal_id: pi.meal_id,
          meal_name: if(Ecto.assoc_loaded?(pi.meal), do: pi.meal.name, else: nil),
          items: today_meal_items(pi)
        }
      end)

    %{
      data: %{
        date: date,
        day: day,
        plan_id: plan.id,
        meals: meals,
        nutrition_summary: Map.get(assigns, :nutrition_summary)
      }
    }
  end

  defp today_meal_items(%PlanItem{meal: %Meal{meal_items: items}}) when is_list(items) do
    Enum.map(items, &today_item_data/1)
  end

  defp today_meal_items(_), do: []

  defp today_item_data(%MealItem{} = item) do
    {food_name, macros} =
      case {item.food, item.recipe} do
        {%Food{} = f, _} -> {f.name, f.macros}
        {_, %Recipe{} = r} -> {r.name, r.macros}
        _ -> {nil, nil}
      end

    %{
      meal_item_id: item.id,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      food_name: food_name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g,
      macros: macros
    }
  end

  defp summary_data(%Plan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      tags: plan.tags || [],
      macros_goal: plan.macros_goal,
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
      plan_items: plan_items_data(plan.plan_items)
    })
  end

  defp meals_data(meals) when is_list(meals), do: Enum.map(meals, &meal_data/1)
  defp meals_data(_), do: []

  defp meal_data(%Meal{} = meal) do
    %{
      id: meal.id,
      name: meal.name,
      macros: meal.macros,
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
      macros: food.macros,
      serving_sizes: serving_sizes_data(food.serving_sizes)
    }
  end

  defp food_data(_), do: nil

  defp recipe_data(%Recipe{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      macros: recipe.macros,
      serving_sizes: serving_sizes_data(recipe.serving_sizes)
    }
  end

  defp recipe_data(_), do: nil

  defp serving_sizes_data(sizes) when is_list(sizes) do
    Enum.map(sizes, fn s -> %{unit: s.unit, weight_g: s.weight_g, amount: s.amount} end)
  end

  defp serving_sizes_data(_), do: []

  defp plan_items_data(items) when is_list(items), do: Enum.map(items, &plan_item_data/1)
  defp plan_items_data(_), do: []

  defp plan_item_data(%PlanItem{} = item) do
    %{
      id: item.id,
      day: item.day,
      meal_type: item.meal_type,
      meal_id: item.meal_id,
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
    }
  end
end
