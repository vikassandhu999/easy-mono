defmodule Easy.Meals do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.Recipe
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @spec get_meal_with_items(String.t(), String.t()) :: {:ok, Meal.t()} | {:error, :not_found}
  def get_meal_with_items(business_id, meal_id) do
    Meal
    |> Meal.for_business(business_id)
    |> preload(meal_items: ^meal_items_with_food_and_recipe(business_id))
    |> Repo.get(meal_id)
    |> ok_or_not_found()
  end

  @spec list_meals(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), meals: [Meal.t()]}} | {:error, :not_found}
  def list_meals(business_id, plan_id, offset, limit) do
    with {:ok, plan} <- get_plan(business_id, plan_id) do
      base = Meal |> Meal.for_business(business_id) |> Meal.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         meals:
           base
           |> Meal.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> preload(meal_items: ^meal_items_with_food_and_recipe(business_id))
           |> Repo.all()
       }}
    end
  end

  @spec create_meal_for_coach_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_meal_for_coach_user(business_id, user_id, plan_id, attrs) do
    with {:ok, coach} <- get_coach_for_user(business_id, user_id),
         {:ok, plan} <- get_plan(business_id, plan_id) do
      plan.id
      |> Meal.insert_changeset(business_id, coach.id, attrs)
      |> Repo.insert()
    end
  end

  @spec update_meal(String.t(), String.t(), map()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_meal(business_id, meal_id, attrs) do
    with {:ok, meal} <- get_meal(business_id, meal_id) do
      meal
      |> Meal.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_meal(String.t(), String.t()) ::
          {:ok, Meal.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_meal(business_id, meal_id) do
    with {:ok, meal} <- get_meal(business_id, meal_id) do
      Repo.delete(meal)
    end
  end

  @spec list_meal_items(String.t(), String.t()) ::
          {:ok, [MealItem.t()]} | {:error, :not_found}
  def list_meal_items(business_id, meal_id) do
    with {:ok, meal} <- get_meal(business_id, meal_id) do
      meal_items =
        business_id
        |> meal_items_with_food_and_recipe()
        |> MealItem.for_meal(meal.id)
        |> Repo.all()

      {:ok, meal_items}
    end
  end

  @spec create_meal_item(String.t(), String.t(), map()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_meal_item(business_id, meal_id, attrs) do
    with {:ok, meal} <- get_meal(business_id, meal_id),
         {:ok, :valid} <- ensure_food_or_recipe(attrs, business_id) do
      changeset = MealItem.insert_changeset(meal.id, business_id, attrs)
      position_given? = Map.has_key?(attrs, "position") or Map.has_key?(attrs, :position)

      changeset =
        if changeset.valid? and not position_given? do
          put_change(changeset, :position, next_position(business_id, meal.id))
        else
          changeset
        end

      Repo.insert(changeset)
    end
  end

  @spec update_meal_item(String.t(), String.t(), map()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_meal_item(business_id, meal_item_id, attrs) do
    with {:ok, meal_item} <- get_meal_item(business_id, meal_item_id),
         {:ok, :valid} <- ensure_food_or_recipe(attrs, business_id) do
      meal_item
      |> MealItem.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @spec delete_meal_item(String.t(), String.t()) ::
          {:ok, MealItem.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_meal_item(business_id, meal_item_id) do
    with {:ok, meal_item} <- get_meal_item(business_id, meal_item_id) do
      Repo.delete(meal_item)
    end
  end

  defp get_meal(business_id, meal_id) do
    Meal
    |> Meal.for_business(business_id)
    |> Repo.get(meal_id)
    |> ok_or_not_found()
  end

  defp get_meal_item(business_id, meal_item_id) do
    MealItem
    |> MealItem.for_business(business_id)
    |> Repo.get(meal_item_id)
    |> ok_or_not_found()
  end

  defp get_plan(business_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  defp get_coach_for_user(business_id, user_id) do
    Coach
    |> Coach.for_business(business_id)
    |> Coach.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ensure_food_or_recipe(params, business_id) do
    food_id = Map.get(params, "food_id")
    recipe_id = Map.get(params, "recipe_id")

    cond do
      food_id && is_nil(Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id)) ->
        {:error, :not_found}

      recipe_id && is_nil(Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id)) ->
        {:error, :not_found}

      true ->
        {:ok, :valid}
    end
  end

  defp meal_items_with_food_and_recipe(business_id) do
    food_query = Food.for_business_or_system(Food, business_id)
    recipe_query = Recipe.for_business(Recipe, business_id)

    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.ordered()
    |> preload(food: ^food_query, recipe: ^recipe_query)
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
