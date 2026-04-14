defmodule EasyWeb.Clients.FoodLogEntryController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.MealLog

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, entry} <- MealLog.log_entry(business_id, client.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food_log_entry: entry)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, entry} <- get_client_entry(business_id, client.id, id),
         {:ok, updated} <- MealLog.update_entry(entry, conn.body_params) do
      render(conn, :show, food_log_entry: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, entry} <- get_client_entry(business_id, client.id, id),
         {:ok, _} <- MealLog.delete_entry(entry) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec log_meal(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_meal(conn, %{"date" => date_str, "meal_slot" => meal_slot, "meal_id" => meal_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str),
         {:ok, entries} <- MealLog.log_meal(business_id, client.id, date, meal_slot, meal_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
    end
  end

  @spec log_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_day(conn, %{"date" => date_str, "plan_id" => plan_id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, date} <- parse_required_date(date_str),
         {:ok, entries} <- MealLog.log_day(business_id, client.id, date, plan_id) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
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

  defp get_client_entry(business_id, client_id, entry_id) do
    case FoodLogEntry.get_for_client(business_id, client_id, entry_id) do
      nil -> {:error, :not_found}
      entry -> {:ok, entry}
    end
  end
end
