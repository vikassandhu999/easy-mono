defmodule EasyWeb.Coaches.MealLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Reads, as: ClientReads
  alias Easy.Nutrition.MealLogging
  alias Easy.Nutrition.Reads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _client} <- ClientReads.fetch_client(business_id, client_id) do
      date = Easy.Utils.safe_date(params["date"])
      from_date = Easy.Utils.safe_date(params["from"])
      to_date = Easy.Utils.safe_date(params["to"])

      with {:ok, meal_logs} <-
             Reads.list_meal_logs(business_id, client_id, date, from_date, to_date) do
        render(conn, :index, meal_logs: meal_logs)
      end
    end
  end

  @spec summary(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def summary(conn, %{"client_id" => client_id, "from" => from_str, "to" => to_str}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _client} <- ClientReads.fetch_client(business_id, client_id),
         from_date when not is_nil(from_date) <- Easy.Utils.safe_date(from_str),
         to_date when not is_nil(to_date) <- Easy.Utils.safe_date(to_str),
         {:ok, meal_logs} <- Reads.list_meal_logs(business_id, client_id, nil, from_date, to_date) do
      render(conn, :summary, summaries: MealLogging.daily_summaries(meal_logs))
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end
end
