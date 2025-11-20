defmodule EasyWeb.MealItemController do
  use EasyWeb, :controller

  alias Easy.Nutrition

  def create(conn, %{"meal_id" => meal_id} = params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, meal_id),
         {:ok, item} <- Nutrition.create_meal_item(meal, params) do
      conn
      |> put_status(:created)
      |> render(:show, %{meal_item: item})
    end
  end

  def index(conn, %{"meal_id" => meal_id}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, meal_id) do
      items = Nutrition.list_meal_items(meal)
      render(conn, :index, %{meal_items: items})
    end
  end

  def update(conn, %{"id" => id} = params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, item} <- Nutrition.fetch_meal_item(business_id, id),
         {:ok, updated_item} <- Nutrition.update_meal_item(item, params) do
      render(conn, :show, %{meal_item: updated_item})
    end
  end

  def delete(conn, %{"id" => id}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, item} <- Nutrition.fetch_meal_item(business_id, id),
         {:ok, _} <- Nutrition.delete_meal_item(item) do
      send_resp(conn, :no_content, "")
    end
  end

  def reorder(conn, %{"meal_id" => meal_id, "item_ids" => item_ids}) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, meal} <- Nutrition.fetch_meal(business_id, meal_id),
         :ok <- Nutrition.reorder_meal_items(meal, item_ids) do
      items = Nutrition.list_meal_items(meal)
      render(conn, :index, %{meal_items: items})
    end
  end
end
