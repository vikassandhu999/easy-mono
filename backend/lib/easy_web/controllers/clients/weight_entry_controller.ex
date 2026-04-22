defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, since_date} <- WeightEntry.parse_since(Map.get(params, "since")) do
      entries =
        WeightEntry
        |> WeightEntry.for_business(business_id)
        |> WeightEntry.for_client(client.id)
        |> maybe_since(since_date)
        |> WeightEntry.ordered()
        |> Repo.all()

      render(conn, :index, entries: entries, client: client)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, entry} <- WeightEntry.upsert(client.id, business_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, weight_entry: entry)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, entry} <- fetch_entry(business_id, client.id, id),
         {:ok, _deleted} <- WeightEntry.delete(entry) do
      send_resp(conn, :no_content, "")
    end
  end

  defp fetch_entry(business_id, client_id, id) do
    case WeightEntry
         |> WeightEntry.for_business(business_id)
         |> WeightEntry.for_client(client_id)
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      entry -> {:ok, entry}
    end
  end

  defp maybe_since(query, nil), do: query
  defp maybe_since(query, date), do: WeightEntry.since(query, date)
end
