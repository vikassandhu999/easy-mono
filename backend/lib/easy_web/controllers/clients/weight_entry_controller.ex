defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :controller

  alias Easy.Fitness.WeightEntries

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, %{client: client, entries: entries}} <-
           WeightEntries.list_entries_for_user(business_id, user_id, Map.get(params, "since")) do
      render(conn, :index, entries: entries, client: client)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, entry} <- WeightEntries.upsert_for_user(business_id, user_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, weight_entry: entry)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- WeightEntries.delete_for_user(business_id, user_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
