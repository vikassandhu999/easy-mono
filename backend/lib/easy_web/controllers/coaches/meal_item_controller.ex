defmodule EasyWeb.Coaches.MealItemController do
  use EasyWeb, :controller

  alias Easy.Meals

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"meal_id" => meal_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal_item} <- Meals.create_meal_item(business_id, meal_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, meal_item: meal_item)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_meal_item} <-
           Meals.update_meal_item(business_id, meal_item_id, conn.body_params) do
      render(conn, :show, meal_item: updated_meal_item)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Meals.delete_meal_item(business_id, meal_item_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"meal_id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal_items} <- Meals.list_meal_items(business_id, meal_id) do
      conn
      |> put_status(:ok)
      |> render(:index, meal_items: meal_items)
    end
  end
end
