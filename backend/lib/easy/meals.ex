defmodule Easy.Meals do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Recipe
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

  @spec create_meal_items(Ctx.t(), String.t(), [map()]) ::
          {:ok, [MealItem.t()]} | {:error, :not_found | Ecto.Changeset.t()}
  def create_meal_items(%Ctx{} = ctx, meal_id, items) do
    with {:ok, meal} <- get_meal(ctx, meal_id) do
      Repo.transaction(fn -> insert_meal_items!(ctx.business_id, meal.id, items) end)
    end
  end

  # The whole batch's foods and recipes are fetched in two IN-queries up front,
  # instead of 2-3 lookups per item.
  defp insert_meal_items!(business_id, meal_id, items) do
    start = next_position(business_id, meal_id)
    {foods, recipes} = load_referenced_library(business_id, items)
    now = DateTime.utc_now(:second)

    rows =
      items
      |> Enum.with_index(start)
      |> Enum.map(fn {attrs, position} ->
        case build_meal_item(business_id, meal_id, attrs, position, foods, recipes) do
          {:ok, item} -> meal_item_row(item, now)
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

    insert_meal_items(rows)
  end

  defp insert_meal_items([]), do: []

  defp insert_meal_items(rows) do
    {_count, inserted} = Repo.insert_all(MealItem, rows, returning: true)
    inserted_by_id = Map.new(inserted, &{&1.id, &1})
    Enum.map(rows, &Map.fetch!(inserted_by_id, &1.id))
  end

  defp meal_item_row(item, now) do
    %{
      id: Ecto.UUID.generate(),
      weight_g: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      position: item.position,
      recipe_id: item.recipe_id,
      food_id: item.food_id,
      nutrition_meal_id: item.nutrition_meal_id,
      business_id: item.business_id,
      inserted_at: now,
      updated_at: now
    }
  end

  defp load_referenced_library(business_id, items) do
    food_ids = items |> Enum.map(&Map.get(&1, :food_id)) |> Enum.reject(&is_nil/1) |> Enum.uniq()

    recipe_ids =
      items |> Enum.map(&Map.get(&1, :recipe_id)) |> Enum.reject(&is_nil/1) |> Enum.uniq()

    foods =
      if food_ids == [] do
        %{}
      else
        Food
        |> Food.for_business_or_system(business_id)
        |> where([f], f.id in ^food_ids)
        |> Repo.all()
        |> Map.new(&{&1.id, &1})
      end

    recipes =
      if recipe_ids == [] do
        %{}
      else
        Recipe
        |> Recipe.for_business(business_id)
        |> where([r], r.id in ^recipe_ids)
        |> Repo.all()
        |> Map.new(&{&1.id, &1})
      end

    {foods, recipes}
  end

  defp build_meal_item(business_id, meal_id, attrs, position, foods, recipes) do
    with :ok <- ensure_referenced(attrs, foods, recipes) do
      business_id
      |> MealItem.insert_changeset(meal_id, attrs)
      |> put_change(:position, position)
      |> validate_recipe_weighable_with(recipes)
      |> apply_action(:insert)
    end
  end

  defp ensure_referenced(attrs, foods, recipes) do
    food_id = Map.get(attrs, :food_id)
    recipe_id = Map.get(attrs, :recipe_id)

    cond do
      food_id && not Map.has_key?(foods, food_id) -> {:error, :not_found}
      recipe_id && not Map.has_key?(recipes, recipe_id) -> {:error, :not_found}
      true -> :ok
    end
  end

  defp validate_recipe_weighable_with(changeset, recipes) do
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g)

    weighable? =
      match?(
        %Recipe{cooked_weight_g: cooked} when is_number(cooked) and cooked > 0,
        Map.get(recipes, recipe_id)
      )

    if is_nil(recipe_id) or is_nil(weight_g) or weighable? do
      changeset
    else
      add_error(changeset, :weight_g, "this recipe has no cooked weight — size it in servings")
    end
  end

  @spec update_meal_item(Ctx.t(), String.t(), map()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_meal_item(%Ctx{} = ctx, meal_item_id, attrs) do
    with {:ok, meal_item} <- get_meal_item(ctx, meal_item_id),
         {:ok, :valid} <- ensure_food_or_recipe(attrs, ctx.business_id) do
      meal_item
      |> MealItem.update_changeset(attrs)
      |> validate_recipe_weighable(ctx.business_id)
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

  # A recipe with no measured cooked weight has no gram denominator, so it can only be
  # sized in servings. Rejected here rather than left to MacroCalc, which would have to
  # invent a number.
  defp validate_recipe_weighable(changeset, business_id) do
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g)

    if is_nil(recipe_id) or is_nil(weight_g) or recipe_weighable?(recipe_id, business_id) do
      changeset
    else
      add_error(changeset, :weight_g, "this recipe has no cooked weight — size it in servings")
    end
  end

  defp recipe_weighable?(recipe_id, business_id) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      %Recipe{cooked_weight_g: cooked} when is_number(cooked) and cooked > 0 -> true
      _ -> false
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
