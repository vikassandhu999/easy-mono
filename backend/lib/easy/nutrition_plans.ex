defmodule Easy.NutritionPlans do
  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_plan_full(String.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def get_plan_full(business_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> with_full_preloads(business_id)
    |> preload(client: ^Client.for_business(business_id))
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec get_client_plan_full_for_user(String.t(), String.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found}
  def get_client_plan_full_for_user(business_id, user_id, plan_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(client.id)
      |> with_full_preloads(business_id)
      |> Repo.get(plan_id)
      |> ok_or_not_found()
    end
  end

  @spec list_template_plans(String.t(), atom() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}}
  def list_template_plans(business_id, status, offset, limit) do
    base =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.with_status(status)
      |> Plan.templates()

    {:ok, paginated(base, offset, limit)}
  end

  @spec list_client_plans_for_user(String.t(), String.t(), atom() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans_for_user(business_id, user_id, status, offset, limit) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      base =
        Plan
        |> Plan.for_business(business_id)
        |> Plan.for_client(client.id)
        |> Plan.with_status(status)

      {:ok, paginated(base, offset, limit)}
    end
  end

  @spec list_client_plans_full_for_client(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}} | {:error, :not_found}
  def list_client_plans_full_for_client(business_id, client_id, status, offset, limit) do
    with {:ok, _client} <- get_client(business_id, client_id) do
      base =
        Plan
        |> Plan.for_business(business_id)
        |> Plan.for_client(client_id)
        |> Plan.with_status(status)

      full = fn query ->
        query
        |> with_full_preloads(business_id)
        |> preload(client: ^Client.for_business(business_id))
      end

      {:ok, paginated(base, offset, limit, full)}
    end
  end

  @spec get_active_plan_day_for_user(String.t(), String.t(), Date.t()) ::
          {:ok, %{date: Date.t(), day: String.t(), plan: Plan.t(), plan_items: [PlanItem.t()]}}
          | {:error, :not_found}
  def get_active_plan_day_for_user(business_id, user_id, date) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      get_active_plan_day(business_id, client.id, date)
    end
  end

  @spec create_plan_for_coach_user(String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_for_coach_user(business_id, user_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_plan(business_id, coach.id, attrs)
    end
  end

  @spec update_plan(String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan(business_id, plan_id, attrs) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      plan
      |> Plan.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_plan(String.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      Repo.delete(plan)
    end
  end

  @spec shopping_list(String.t(), String.t()) :: {:ok, [map()]} | {:error, :not_found}
  def shopping_list(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      plan = Repo.preload(plan, meals: meals_with_items(plan.business_id))

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
  end

  @spec macros(String.t(), String.t()) :: {:ok, map()} | {:error, :not_found}
  def macros(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      plan =
        Repo.preload(plan, meals: Meal |> Meal.for_business(plan.business_id) |> Meal.ordered())

      totals =
        Enum.reduce(plan.meals, %{}, fn meal, acc ->
          merge_macros(acc, meal.macros || %{})
        end)

      {:ok, totals}
    end
  end

  @spec copy_day_for_coach_user(
          String.t(),
          String.t(),
          String.t(),
          String.t() | nil,
          String.t() | nil,
          boolean()
        ) ::
          {:ok, [PlanItem.t()]} | {:error, any()}
  def copy_day_for_coach_user(business_id, user_id, plan_id, source_day, target_day, clear_existing) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id),
         {:ok, plan} <- get_plan(business_id, plan_id) do
      copy_day(plan, source_day, target_day, coach.id, clear_existing)
    end
  end

  @spec assign_to_client_for_coach_user(String.t(), String.t(), String.t(), String.t(), map()) ::
          {:ok, Plan.t()} | {:error, any()}
  def assign_to_client_for_coach_user(business_id, user_id, plan_id, client_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id),
         {:ok, plan} <- get_plan(business_id, plan_id),
         {:ok, _client} <- get_client(business_id, client_id) do
      assign_to_client(plan, client_id, coach.id, attrs)
    end
  end

  @spec duplicate_for_coach_user(String.t(), String.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, any()}
  def duplicate_for_coach_user(business_id, user_id, plan_id) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id),
         {:ok, plan} <- get_plan(business_id, plan_id) do
      duplicate(plan, coach.id)
    end
  end

  @spec list_plan_items(String.t(), String.t()) ::
          {:ok, [PlanItem.t()]} | {:error, :not_found}
  def list_plan_items(business_id, plan_id) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> with_meal(business_id)
        |> Repo.all()

      {:ok, plan_items}
    end
  end

  @spec create_plan_item(String.t(), String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item(plan_id, business_id, creator_id, attrs) do
    with {:ok, plan} <- get_plan(business_id, plan_id),
         {:ok, :valid} <- ensure_meal_for_plan(plan.id, business_id, Map.get(attrs, "meal_id")) do
      plan.id
      |> PlanItem.insert_changeset(business_id, creator_id, attrs)
      |> Repo.insert()
    end
  end

  @spec create_plan_item_for_coach_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item_for_coach_user(business_id, user_id, plan_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id) do
      create_plan_item(plan_id, business_id, coach.id, attrs)
    end
  end

  @spec update_plan_item(String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan_item(business_id, plan_item_id, attrs) do
    with {:ok, plan_item} <- get_plan_item(business_id, plan_item_id),
         {:ok, :valid} <-
           ensure_meal_for_plan(
             plan_item.plan_id,
             plan_item.business_id,
             Map.get(attrs, "meal_id")
           ) do
      plan_item
      |> PlanItem.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_plan_item(String.t(), String.t()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_plan_item(business_id, plan_item_id) do
    with {:ok, plan_item} <- get_plan_item(business_id, plan_item_id) do
      Repo.delete(plan_item)
    end
  end

  # Private

  defp get_plan(business_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  defp get_active_plan_day(business_id, client_id, date) do
    case active_plan(business_id, client_id, date) do
      nil ->
        {:error, :not_found}

      plan ->
        day = Easy.Utils.weekday_name(date)

        plan_items =
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_business(business_id)
          |> PlanItem.for_day(day)
          |> with_meal_and_items(business_id)
          |> Repo.all()

        {:ok, %{plan: plan, plan_items: plan_items, date: date, day: day}}
    end
  end

  defp create_plan(business_id, creator_id, attrs) do
    business_id
    |> Plan.insert_changeset(creator_id, attrs)
    |> Repo.insert()
  end

  defp copy_day(plan, source_day, target_day, creator_id, clear_existing) do
    with :ok <- validate_copy_day(source_day, target_day) do
      Repo.transaction(fn ->
        source_items =
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_business(plan.business_id)
          |> PlanItem.for_day(source_day)
          |> Repo.all()

        if clear_existing do
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_business(plan.business_id)
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

  defp assign_to_client(plan, client_id, creator_id, attrs) do
    copy_plan(plan, creator_id,
      client_id: client_id,
      source_template_id: plan.id,
      status: :active,
      start_date: Map.get(attrs, "start_date") || Map.get(attrs, :start_date),
      end_date: Map.get(attrs, "end_date") || Map.get(attrs, :end_date)
    )
  end

  defp duplicate(plan, creator_id) do
    copy_plan(plan, creator_id,
      name: "#{plan.name} (Copy)",
      client_id: nil,
      source_template_id: plan.source_template_id || plan.id,
      status: :active
    )
  end

  defp get_plan_item(business_id, plan_item_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> Repo.get(plan_item_id)
    |> ok_or_not_found()
  end

  defp paginated(base, offset, limit, preload_fun \\ & &1) do
    %{
      count: Repo.aggregate(base, :count, :id),
      plans:
        base
        |> Plan.newest()
        |> Easy.Utils.paginate(offset, limit)
        |> preload_fun.()
        |> Repo.all()
    }
  end

  defp with_full_preloads(query, business_id) do
    from(p in query,
      preload: [
        meals: ^meals_with_items(business_id),
        plan_items: ^plan_items_with_meal(business_id)
      ]
    )
  end

  defp with_meal(query, business_id) do
    from(pi in query, preload: [meal: ^Meal.for_business(Meal, business_id)])
  end

  defp with_meal_and_items(query, business_id) do
    from(pi in query, preload: [meal: ^meals_with_items(business_id)])
  end

  defp meals_with_items(business_id) do
    Meal
    |> Meal.for_business(business_id)
    |> Meal.ordered()
    |> preload(meal_items: ^meal_items_with_food_and_recipe(business_id))
  end

  defp plan_items_with_meal(business_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> with_meal(business_id)
  end

  defp meal_items_with_food_and_recipe(business_id) do
    food_query = Food.for_business_or_system(Food, business_id)
    recipe_query = Recipe.for_business(Recipe, business_id)

    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.ordered()
    |> preload(food: ^food_query, recipe: ^recipe_query)
  end

  defp active_plan(business_id, client_id, date) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.active_for_client(client_id, date)
    |> Plan.newest()
    |> limit(1)
    |> Repo.one()
  end

  defp get_client(_business_id, nil), do: {:error, :not_found}
  defp get_client(_business_id, ""), do: {:error, :not_found}

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp get_client_for_user(business_id, user_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ensure_meal_for_plan(_plan_id, _business_id, nil), do: {:ok, :valid}

  defp ensure_meal_for_plan(plan_id, business_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Meal.for_plan(plan_id) |> Repo.get(meal_id) do
      nil -> {:error, :not_found}
      _meal -> {:ok, :valid}
    end
  end

  defp copy_plan(plan, creator_id, opts) do
    Repo.transaction(fn ->
      meal_query =
        Meal
        |> Meal.for_business(plan.business_id)
        |> Meal.ordered()
        |> preload(meal_items: ^MealItem.for_business(MealItem, plan.business_id))

      plan_item_query = PlanItem.for_business(PlanItem, plan.business_id)
      plan = Repo.preload(plan, meals: meal_query, plan_items: plan_item_query)

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
          meals: meals_with_items(new_plan.business_id),
          plan_items: plan_items_with_meal(new_plan.business_id)
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

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
