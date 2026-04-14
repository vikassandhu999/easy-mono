defmodule EasyWeb.Coaches.MealLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.MealLog
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      date = Easy.Utils.safe_date(params["date"])
      from_date = Easy.Utils.safe_date(params["from"])
      to_date = Easy.Utils.safe_date(params["to"])

      base =
        MealLog
        |> MealLog.for_business(business_id)
        |> MealLog.for_client(client_id)

      base = apply_date_filters(base, date, from_date, to_date)

      meal_logs =
        base
        |> MealLog.ordered()
        |> MealLog.with_entries()
        |> Repo.all()

      render(conn, :index, meal_logs: meal_logs)
    else
      false -> {:error, :not_found}
    end
  end

  @spec summary(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def summary(conn, %{"client_id" => client_id, "from" => from_str, "to" => to_str}) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id),
         from_date when not is_nil(from_date) <- Easy.Utils.safe_date(from_str),
         to_date when not is_nil(to_date) <- Easy.Utils.safe_date(to_str) do
      meal_logs =
        MealLog
        |> MealLog.for_business(business_id)
        |> MealLog.for_client(client_id)
        |> MealLog.for_date_range(from_date, to_date)
        |> MealLog.ordered()
        |> MealLog.with_entries()
        |> Repo.all()

      render(conn, :summary, summaries: MealLog.daily_summaries(meal_logs))
    else
      false -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  defp apply_date_filters(query, date, _from, _to) when not is_nil(date) do
    MealLog.for_date(query, date)
  end

  defp apply_date_filters(query, _, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    MealLog.for_date_range(query, from_date, to_date)
  end

  defp apply_date_filters(query, _, _, _), do: query
end
