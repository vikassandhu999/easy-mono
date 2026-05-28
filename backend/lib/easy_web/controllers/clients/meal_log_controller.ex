defmodule EasyWeb.Clients.MealLogController do
  use EasyWeb, :controller

  alias Easy.MealLogs

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"])

    with {:ok, meal_logs} <-
           MealLogs.list_meal_logs_for_user(business_id, user_id, date, nil, nil) do
      render(conn, :index, meal_logs: meal_logs)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, meal_log} <- MealLogs.fetch_client_meal_log_for_user(business_id, user_id, id) do
      render(conn, :show, meal_log: meal_log)
    end
  end
end
