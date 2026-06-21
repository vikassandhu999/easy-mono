defmodule Easy.NutritionPlans do
  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
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

  @spec create_plan_item(String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item(plan_id, business_id, attrs) do
    meal_ref = Map.get(attrs, "nutrition_meal_id") || Map.get(attrs, "meal_id")

    with {:ok, plan} <- get_plan(business_id, plan_id),
         {:ok, :valid} <- ensure_meal_for_plan(plan.id, business_id, meal_ref) do
      plan.id
      |> PlanItem.insert_changeset(business_id, attrs)
      |> Repo.insert()
    end
  end

  @spec create_plan_item_for_coach_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_plan_item_for_coach_user(business_id, user_id, plan_id, attrs) do
    with {:ok, _coach} <- get_coach_for_user(business_id, user_id) do
      create_plan_item(plan_id, business_id, attrs)
    end
  end

  @spec update_plan_item(String.t(), String.t(), map()) ::
          {:ok, PlanItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_plan_item(business_id, plan_item_id, attrs) do
    meal_ref = Map.get(attrs, "nutrition_meal_id") || Map.get(attrs, "meal_id")

    with {:ok, plan_item} <- get_plan_item(business_id, plan_item_id),
         {:ok, :valid} <-
           ensure_meal_for_plan(
             plan_item.nutrition_plan_id,
             plan_item.business_id,
             meal_ref
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

    recipe_query =
      from(r in Recipe.for_business(Recipe, business_id),
        preload: [recipe_ingredients: ^from(ri in RecipeIngredient, preload: [food: ^food_query])]
      )

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
        target_calories: plan.target_calories,
        target_protein_g: plan.target_protein_g,
        target_carbs_g: plan.target_carbs_g,
        target_fat_g: plan.target_fat_g,
        target_fiber_g: plan.target_fiber_g,
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
      attrs = %{name: meal.name, notes: meal.notes, default_meal_slot: meal.default_meal_slot}

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

  defp copy_plan_items(plan_items, new_plan_id, business_id, meal_map) do
    Enum.reduce_while(plan_items, {:ok, []}, fn plan_item, {:ok, acc} ->
      new_meal = Map.get(meal_map, plan_item.nutrition_meal_id)

      if is_nil(new_meal) do
        {:halt, {:error, :meal_not_found_in_plan}}
      else
        attrs = %{
          day_of_week: plan_item.day_of_week,
          meal_slot: plan_item.meal_slot,
          nutrition_meal_id: new_meal.id
        }

        case PlanItem.insert_changeset(new_plan_id, business_id, attrs)
             |> Repo.insert() do
          {:ok, new_plan_item} -> {:cont, {:ok, [new_plan_item | acc]}}
          {:error, reason} -> {:halt, {:error, reason}}
        end
      end
    end)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
