defmodule EasyWeb.Coaches.MealItemController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  def create(conn, %{"meal_id" => meal_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with meal when not is_nil(meal) <- Meal |> Meal.for_business(business_id) |> Repo.get(meal_id),
         :ok <- ensure_food_or_recipe(params, business_id),
         {:ok, meal_item} <- MealItem.create(meal.id, business_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, meal_item: meal_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def update(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with meal_item when not is_nil(meal_item) <-
           MealItem |> MealItem.for_business(business_id) |> Repo.get(meal_item_id),
         :ok <- ensure_food_or_recipe(conn.body_params, business_id),
         {:ok, updated_meal_item} <- MealItem.update(meal_item, conn.body_params) do
      render(conn, :show, meal_item: updated_meal_item)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with meal_item when not is_nil(meal_item) <-
           MealItem |> MealItem.for_business(business_id) |> Repo.get(meal_item_id),
         {:ok, _deleted} <- MealItem.delete(meal_item) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def index(conn, %{"meal_id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with meal when not is_nil(meal) <- Meal |> Meal.for_business(business_id) |> Repo.get(meal_id) do
      meal_items =
        MealItem
        |> MealItem.for_meal(meal.id)
        |> MealItem.ordered()
        |> MealItem.with_food_and_recipe()
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, meal_items: meal_items)
    else
      nil -> {:error, :not_found}
    end
  end

  defp ensure_food_or_recipe(params, business_id) do
    food_id = Map.get(params, "food_id")
    recipe_id = Map.get(params, "recipe_id")

    with :ok <- ensure_food(food_id, business_id),
         :ok <- ensure_recipe(recipe_id, business_id) do
      :ok
    end
  end

  defp ensure_food(nil, _business_id), do: :ok

  defp ensure_food(food_id, business_id) do
    case Food |> Food.for_business(business_id) |> Repo.get(food_id) do
      nil -> {:error, :not_found}
      _food -> :ok
    end
  end

  defp ensure_recipe(nil, _business_id), do: :ok

  defp ensure_recipe(recipe_id, business_id) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      nil -> {:error, :not_found}
      _recipe -> :ok
    end
  end
end
