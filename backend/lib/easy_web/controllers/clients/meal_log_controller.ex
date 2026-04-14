defmodule EasyWeb.Clients.MealLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.MealLog
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      date = Easy.Utils.safe_date(params["date"])

      base =
        MealLog
        |> MealLog.for_business(business_id)
        |> MealLog.for_client(client.id)

      base = if date, do: MealLog.for_date(base, date), else: base

      meal_logs =
        base
        |> MealLog.ordered()
        |> MealLog.with_entries()
        |> Repo.all()

      render(conn, :index, meal_logs: meal_logs)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      case MealLog
           |> MealLog.for_business(business_id)
           |> MealLog.for_client(client.id)
           |> MealLog.with_entries()
           |> Repo.get(id) do
        nil -> {:error, :not_found}
        meal_log -> render(conn, :show, meal_log: meal_log)
      end
    end
  end
end
