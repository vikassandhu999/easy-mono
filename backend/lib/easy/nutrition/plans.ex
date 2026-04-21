defmodule Easy.Nutrition.Plans do
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec shopping_list(Plan.t()) :: {:ok, [map()]}
  def shopping_list(plan) do
    plan = Repo.preload(plan, meals: Meal |> Meal.ordered() |> Meal.with_items())

    items =
      plan.meals
      |> Enum.flat_map(& &1.meal_items)
      |> Enum.reduce(%{}, fn item, acc ->
        key = {item.food_id, item.recipe_id, item.unit}
        entry = Map.get(acc, key, build_shopping_item(item))

        Map.put(acc, key, %{
          entry
          | amount: add_number(entry.amount, item.amount),
            weight_g: add_number(entry.weight_g, item.weight_g)
        })
      end)
      |> Map.values()

    {:ok, items}
  end

  @spec macros(Plan.t()) :: {:ok, map()}
  def macros(plan) do
    plan = Repo.preload(plan, meals: Meal |> Meal.ordered())

    totals =
      Enum.reduce(plan.meals, %{}, fn meal, acc ->
        merge_macros(acc, meal.macros || %{})
      end)

    {:ok, totals}
  end

  @spec copy_day(Plan.t(), String.t(), String.t(), String.t(), boolean()) ::
          {:ok, [PlanItem.t()]} | {:error, any()}
  def copy_day(plan, source_day, target_day, creator_id, clear_existing) do
    with :ok <- validate_copy_day(source_day, target_day) do
      Repo.transaction(fn ->
        source_items =
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_day(source_day)
          |> Repo.all()

        if clear_existing do
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_day(target_day)
          |> Repo.delete_all()
        end

        Enum.map(source_items, fn item ->
          attrs = %{day: target_day, meal_type: item.meal_type, meal_id: item.meal_id}

          case PlanItem.insert_changeset(plan.id, plan.business_id, creator_id, attrs)
               |> Repo.insert() do
            {:ok, new_item} -> new_item
            {:error, reason} -> Repo.rollback(reason)
          end
        end)
      end)
    end
  end

  @spec assign_to_client(Plan.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, any()}
  def assign_to_client(plan, client_id, creator_id, attrs \\ %{}) do
    copy_plan(plan, creator_id,
      client_id: client_id,
      source_template_id: plan.id,
      status: :active,
      start_date: Map.get(attrs, "start_date") || Map.get(attrs, :start_date),
      end_date: Map.get(attrs, "end_date") || Map.get(attrs, :end_date)
    )
  end

  @spec duplicate(Plan.t(), String.t()) :: {:ok, Plan.t()} | {:error, any()}
  def duplicate(plan, creator_id) do
    copy_plan(plan, creator_id,
      name: "#{plan.name} (Copy)",
      client_id: nil,
      source_template_id: plan.source_template_id || plan.id,
      status: :active
    )
  end

  # Private

  defp copy_plan(plan, creator_id, opts) do
    Repo.transaction(fn ->
      meal_query = Meal |> Meal.ordered() |> preload(:meal_items)
      plan = Repo.preload(plan, meals: meal_query, plan_items: [])

      attrs = %{
        name: Keyword.get(opts, :name, plan.name),
        description: plan.description,
        tags: plan.tags,
        macros_goal: plan.macros_goal,
        status: Keyword.get(opts, :status, plan.status),
        start_date: Keyword.get(opts, :start_date),
        end_date: Keyword.get(opts, :end_date)
      }

      changeset =
        Plan.insert_changeset(plan.business_id, creator_id, attrs)
        |> put_change(:client_id, Keyword.get(opts, :client_id))
        |> put_change(:source_template_id, Keyword.get(opts, :source_template_id))

      with {:ok, new_plan} <- Repo.insert(changeset),
           {:ok, meal_map} <-
             copy_meals(plan.meals, new_plan.id, new_plan.business_id, creator_id),
           {:ok, _} <-
             copy_plan_items(
               plan.plan_items,
               new_plan.id,
               new_plan.business_id,
               creator_id,
               meal_map
             ) do
        Repo.preload(new_plan,
          meals: Meal |> Meal.ordered() |> Meal.with_items(),
          plan_items: PlanItem.with_meal()
        )
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp copy_meals(meals, new_plan_id, business_id, creator_id) do
    Enum.reduce_while(meals, {:ok, %{}}, fn meal, {:ok, acc} ->
      attrs = %{name: meal.name, macros: meal.macros}

      case Meal.insert_changeset(new_plan_id, business_id, creator_id, attrs) |> Repo.insert() do
        {:ok, new_meal} ->
          case copy_meal_items(meal.meal_items, new_meal.id, business_id) do
            {:ok, _} -> {:cont, {:ok, Map.put(acc, meal.id, new_meal)}}
            {:error, reason} -> {:halt, {:error, reason}}
          end

        {:error, reason} ->
          {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_meal_items(meal_items, new_meal_id, business_id) do
    Enum.reduce_while(meal_items, {:ok, []}, fn meal_item, {:ok, acc} ->
      attrs = %{
        weight_g: meal_item.weight_g,
        amount: meal_item.amount,
        unit: meal_item.unit,
        position: meal_item.position,
        recipe_id: meal_item.recipe_id,
        food_id: meal_item.food_id
      }

      case MealItem.insert_changeset(new_meal_id, business_id, attrs) |> Repo.insert() do
        {:ok, new_item} -> {:cont, {:ok, [new_item | acc]}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp copy_plan_items(plan_items, new_plan_id, business_id, creator_id, meal_map) do
    Enum.reduce_while(plan_items, {:ok, []}, fn plan_item, {:ok, acc} ->
      new_meal = Map.get(meal_map, plan_item.meal_id)

      if is_nil(new_meal) do
        {:halt, {:error, :meal_not_found_in_plan}}
      else
        attrs = %{
          day: plan_item.day,
          meal_type: plan_item.meal_type,
          meal_id: new_meal.id
        }

        case PlanItem.insert_changeset(new_plan_id, business_id, creator_id, attrs)
             |> Repo.insert() do
          {:ok, new_plan_item} -> {:cont, {:ok, [new_plan_item | acc]}}
          {:error, reason} -> {:halt, {:error, reason}}
        end
      end
    end)
  end

  defp build_shopping_item(item) do
    {label, type} =
      cond do
        not is_nil(item.food) -> {item.food.name, :food}
        not is_nil(item.recipe) -> {item.recipe.name, :recipe}
        not is_nil(item.food_id) -> {nil, :food}
        not is_nil(item.recipe_id) -> {nil, :recipe}
        true -> {nil, :unknown}
      end

    %{
      type: type,
      name: label,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      unit: item.unit,
      amount: 0,
      weight_g: 0
    }
  end

  defp add_number(left, right), do: (left || 0) + (right || 0)

  defp merge_macros(acc, macros) when is_map(macros) do
    Enum.reduce(macros, acc, fn {key, value}, totals ->
      key = to_string(key)

      if is_number(value) do
        Map.update(totals, key, value, &(&1 + value))
      else
        totals
      end
    end)
  end

  defp validate_copy_day(nil, _target_day) do
    {:error, Easy.Error.unprocessable(%{fields: %{source_day: ["can't be blank"]}})}
  end

  defp validate_copy_day(_source_day, nil) do
    {:error, Easy.Error.unprocessable(%{fields: %{target_day: ["can't be blank"]}})}
  end

  defp validate_copy_day(source_day, target_day) when source_day == target_day do
    {:error, Easy.Error.unprocessable(%{fields: %{target_day: ["must differ from source_day"]}})}
  end

  defp validate_copy_day(_source_day, _target_day), do: :ok
end
