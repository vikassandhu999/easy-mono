defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller

  def invite(conn, params) do
    with {:ok, client} <- Easy.Clients.invite(conn.assigns.claims, params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  def show(conn, %{"id" => client_id}) do
    with {:ok, client} <- Easy.Clients.get(conn.assigns.claims, client_id) do
      conn
      |> put_status(:ok)
      |> render(:show, client: client)
    end
  end

  def index(conn, params) do
    search_opts = %{
      search: Map.get(params, "search", ""),
      offset: String.to_integer(Map.get(params, "offset", "0")),
      limit: String.to_integer(Map.get(params, "limit", "10")),
      status: Map.get(params, "status", nil)
    }

    with {:ok, count, clients} <- Easy.Clients.list_clients(conn.assigns.claims, search_opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, clients: clients)
    end
  end
end
