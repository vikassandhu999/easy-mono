defmodule EasyWeb.Clients.FoodLogEntryController do
  use EasyWeb, :controller

  alias Easy.MealLogs

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, entry} <- MealLogs.log_entry_for_user(business_id, user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food_log_entry: entry)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <-
           MealLogs.update_entry_for_user(business_id, user_id, id, conn.body_params) do
      render(conn, :show, food_log_entry: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, _} <- MealLogs.delete_entry_for_user(business_id, user_id, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec log_meal(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_meal(conn, %{"date" => date_str, "meal_slot" => meal_slot, "meal_id" => meal_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, entries} <-
           MealLogs.log_meal_for_user(business_id, user_id, date_str, meal_slot, meal_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
    end
  end

  @spec log_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_day(conn, %{"date" => date_str, "plan_id" => plan_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, entries} <- MealLogs.log_day_for_user(business_id, user_id, date_str, plan_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
    end
  end
end
