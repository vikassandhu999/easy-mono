defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Error
  alias Easy.Repo

  def invite(conn, params) do
    with {:ok, client} <- Client.invite(conn.assigns.claims, params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  def show(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    case Client
         |> Client.for_business(business_id)
         |> Client.with_preloads()
         |> Repo.get(client_id) do
      nil -> {:error, Error.not_found("Client not found")}
      client -> render(conn, :show, client: client)
    end
  end

  def index(conn, params) do
    business_id = conn.assigns.claims.business_id

    search_term = Map.get(params, "search", "")
    offset = params |> Map.get("offset", "0") |> String.to_integer()
    limit = params |> Map.get("limit", "10") |> String.to_integer()
    status = Map.get(params, "status", nil)

    base =
      Client
      |> Client.for_business(business_id)
      |> Client.search(search_term)
      |> Client.with_status(status)

    count = Repo.aggregate(base, :count, :id)

    clients =
      base
      |> Client.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Client.with_preloads()
      |> Repo.all()

    conn
    |> put_status(:ok)
    |> render(:index, count: count, clients: clients)
  end
end
