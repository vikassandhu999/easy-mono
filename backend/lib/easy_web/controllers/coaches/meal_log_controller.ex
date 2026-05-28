defmodule EasyWeb.Coaches.MealLogController do
  use EasyWeb, :controller

  alias Easy.MealLogs

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"])
    from_date = Easy.Utils.safe_date(params["from"])
    to_date = Easy.Utils.safe_date(params["to"])

    with {:ok, meal_logs} <-
           MealLogs.list_meal_logs_for_client(business_id, client_id, date, from_date, to_date) do
      render(conn, :index, meal_logs: meal_logs)
    end
  end

  @spec summary(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def summary(conn, %{"client_id" => client_id, "from" => from_str, "to" => to_str}) do
    %{business_id: business_id} = conn.assigns.claims

    with from_date when not is_nil(from_date) <- Easy.Utils.safe_date(from_str),
         to_date when not is_nil(to_date) <- Easy.Utils.safe_date(to_str),
         {:ok, summaries} <-
           MealLogs.summarize_client_meal_logs(business_id, client_id, from_date, to_date) do
      render(conn, :summary, summaries: summaries)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end
end
