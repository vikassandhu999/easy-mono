defmodule Easy.Meals do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Recipe
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_meal_with_items(Ctx.t(), String.t()) :: {:ok, Meal.t()} | {:error, :not_found}
  def get_meal_with_items(%Ctx{} = ctx, meal_id) do
    with {:ok, _meal} <- get_meal(ctx, meal_id) do
      Meal
      |> Meal.for_business(ctx.business_id)
      |> preload(meal_items: ^MealItem.include_food_and_recipe(MealItem, ctx.business_id))
      |> Repo.get(meal_id)
      |> ok_or_not_found()
    end
  end

  @spec list_meals(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), meals: [Meal.t()]}} | {:error, :not_found}
  def list_meals(%Ctx{} = ctx, plan_id, opts \\ []) do
    offset = opts |> Keyword.get(:offset, 0) |> max(0)
    limit = opts |> Keyword.get(:limit, 20) |> min(100) |> max(1)

    with {:ok, plan} <- get_plan(ctx, plan_id) do
      base = Meal |> Meal.for_business(ctx.business_id) |> Meal.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         meals:
           base
           |> Meal.oldest()
           |> Easy.Utils.paginate(offset, limit)
           |> preload(meal_items: ^MealItem.include_food_and_recipe(MealItem, ctx.business_id))
           |> Repo.all()
       }}
    end
  end

  @spec create_meal(Ctx.t(), String.t(), map()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_meal(%Ctx{} = ctx, plan_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, plan} <- get_plan(ctx, plan_id),
         {:ok, meal} <-
           Meal.insert_changeset(ctx.business_id, coach.id, plan.id, attrs)
           |> Repo.insert() do
      get_meal_with_items(ctx, meal.id)
    end
  end

  @spec update_meal(Ctx.t(), String.t(), map()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_meal(%Ctx{} = ctx, meal_id, attrs) do
    with {:ok, meal} <- get_meal(ctx, meal_id),
         {:ok, updated} <-
           meal
           |> Meal.update_changeset(attrs)
           |> Repo.update() do
      get_meal_with_items(ctx, updated.id)
    end
  end

  @spec delete_meal(Ctx.t(), String.t()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_meal(%Ctx{} = ctx, meal_id) do
    with {:ok, meal} <- get_meal(ctx, meal_id) do
      Repo.delete(meal)
    end
  end

  @spec create_meal_item(Ctx.t(), String.t(), map()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_meal_item(%Ctx{} = ctx, meal_id, attrs) do
    with {:ok, meal} <- get_meal(ctx, meal_id),
         {:ok, :valid} <- ensure_food_or_recipe(attrs, ctx.business_id) do
      changeset = MealItem.insert_changeset(ctx.business_id, meal.id, attrs)
      position_given? = Map.has_key?(attrs, :position)

      changeset =
        if changeset.valid? and not position_given? do
          put_change(changeset, :position, next_position(ctx.business_id, meal.id))
        else
          changeset
        end

      Repo.insert(changeset)
    end
  end

  @spec update_meal_item(Ctx.t(), String.t(), map()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_meal_item(%Ctx{} = ctx, meal_item_id, attrs) do
    with {:ok, meal_item} <- get_meal_item(ctx, meal_item_id),
         {:ok, :valid} <- ensure_food_or_recipe(attrs, ctx.business_id) do
      meal_item
      |> MealItem.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_meal_item(Ctx.t(), String.t()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_meal_item(%Ctx{} = ctx, meal_item_id) do
    with {:ok, meal_item} <- get_meal_item(ctx, meal_item_id) do
      Repo.delete(meal_item)
    end
  end

  defp get_meal(%Ctx{} = ctx, meal_id) do
    meal =
      Meal
      |> Meal.for_business(ctx.business_id)
      |> Repo.get(meal_id)

    with {:ok, meal} <- ok_or_not_found(meal),
         {:ok, _plan} <- get_plan(ctx, meal.nutrition_plan_id) do
      {:ok, meal}
    end
  end

  defp get_meal_item(%Ctx{} = ctx, meal_item_id) do
    meal_item =
      MealItem
      |> MealItem.for_business(ctx.business_id)
      |> Repo.get(meal_item_id)

    with {:ok, meal_item} <- ok_or_not_found(meal_item),
         {:ok, _meal} <- get_meal(ctx, meal_item.nutrition_meal_id) do
      {:ok, meal_item}
    end
  end

  defp get_plan(%Ctx{} = ctx, plan_id) do
    plan =
      Plan
      |> Plan.for_business(ctx.business_id)
      |> Repo.get(plan_id)

    with {:ok, plan} <- ok_or_not_found(plan),
         :ok <- Clients.authorize_client_id(ctx, plan.client_id) do
      {:ok, plan}
    end
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ensure_food_or_recipe(params, business_id) do
    food_id = Map.get(params, :food_id)
    recipe_id = Map.get(params, :recipe_id)

    cond do
      food_id && is_nil(Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id)) ->
        {:error, :not_found}

      recipe_id && is_nil(Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id)) ->
        {:error, :not_found}

      true ->
        {:ok, :valid}
    end
  end

  defp next_position(business_id, meal_id) do
    query =
      MealItem
      |> MealItem.for_business(business_id)
      |> MealItem.for_meal(meal_id)
      |> select([m], max(m.position))

    case Repo.one(query) do
      nil -> 0
      max -> max + 1
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
