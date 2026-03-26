defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Error
  alias Easy.Orgs.Coaches
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

  def update(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with client when not is_nil(client) <-
           Client
           |> Client.for_business(business_id)
           |> Client.with_preloads()
           |> Repo.get(client_id),
         {:ok, updated_client} <- Client.update(client, conn.body_params) do
      render(conn, :show, client: updated_client)
    else
      nil -> {:error, Error.not_found("Client not found")}
      error -> error
    end
  end

  def resend_invite(conn, %{"id" => client_id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with client when not is_nil(client) <-
           Client |> Client.for_business(business_id) |> Repo.get(client_id),
         {:ok, coach} <- Coaches.get_by_user_id(user_id, business_id),
         {:ok, updated_client} <- Client.resend_invitation(client, coach) do
      render(conn, :show, client: updated_client)
    else
      nil -> {:error, Error.not_found("Client not found")}
      error -> error
    end
  end

  def index(conn, params) do
    business_id = conn.assigns.claims.business_id

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
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
