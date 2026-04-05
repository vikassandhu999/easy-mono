defmodule EasyWeb.Clients.FoodLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLog
  alias Easy.Repo

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, log} <- FoodLog.create(business_id, client.id, params) do
      log = Repo.preload(log, [:food, :recipe])

      conn
      |> put_status(:created)
      |> render(:show, food_log: log)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      date = Easy.Utils.safe_date(params["date"])

      base =
        FoodLog
        |> FoodLog.for_business(business_id)
        |> FoodLog.for_client(client.id)

      base = if date, do: FoodLog.for_date(base, date), else: base

      logs =
        base
        |> FoodLog.ordered()
        |> FoodLog.with_associations()
        |> Repo.all()

      render(conn, :index, food_logs: logs)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, log} <- get_client_log(business_id, client.id, id),
         {:ok, updated} <- FoodLog.update(log, conn.body_params) do
      updated = Repo.preload(updated, [:food, :recipe])
      render(conn, :show, food_log: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, log} <- get_client_log(business_id, client.id, id),
         {:ok, _} <- FoodLog.delete(log) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec log_meal(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_meal(conn, %{"date" => date_str, "meal_slot" => meal_slot, "meal_id" => meal_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str),
         {:ok, logs} <- FoodLog.log_meal(business_id, client.id, date, meal_slot, meal_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_logs: logs)
    end
  end

  @spec log_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_day(conn, %{"date" => date_str, "plan_id" => plan_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str),
         {:ok, logs} <- FoodLog.log_day(business_id, client.id, date, plan_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_logs: logs)
    end
  end

  defp parse_required_date(date_str) when is_binary(date_str) do
    case Date.from_iso8601(date_str) do
      {:ok, _date} = ok -> ok
      _ -> {:error, Easy.Error.unprocessable(%{fields: %{date: ["is invalid"]}})}
    end
  end

  defp parse_required_date(_) do
    {:error, Easy.Error.unprocessable(%{fields: %{date: ["can't be blank"]}})}
  end

  defp get_client_log(business_id, client_id, log_id) do
    case FoodLog
         |> FoodLog.for_business(business_id)
         |> FoodLog.for_client(client_id)
         |> FoodLog.with_associations()
         |> Repo.get(log_id) do
      nil -> {:error, :not_found}
      log -> {:ok, log}
    end
  end
end
