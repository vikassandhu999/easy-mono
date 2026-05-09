defmodule EasyWeb.Clients.MealLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.Reads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      date = Easy.Utils.safe_date(params["date"])

      with {:ok, meal_logs} <- Reads.list_meal_logs(business_id, client.id, date, nil, nil) do
        render(conn, :index, meal_logs: meal_logs)
      end
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, meal_log} <- Reads.fetch_client_meal_log(business_id, client.id, id) do
      render(conn, :show, meal_log: meal_log)
    end
  end
end
