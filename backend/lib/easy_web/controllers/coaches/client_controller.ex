defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Error
  alias Easy.Orgs.Coaches
  alias Easy.Repo

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, params) do
    with {:ok, client} <- Client.invite(conn.assigns.claims, params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with client when not is_nil(client) <-
           Client
           |> Client.for_business(business_id)
           |> Client.with_preloads()
           |> Repo.get(client_id),
         {:ok, updated_client} <- Client.update(client, conn.body_params),
         updated_client <-
           Repo.preload(updated_client, [:user, :business, :creator, :offer], force: true) do
      render(conn, :show, client: updated_client)
    else
      nil -> {:error, Error.not_found("Client not found")}
      error -> error
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
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

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    business_id = conn.assigns.claims.business_id

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = Map.get(params, "status")
    payment_status = Map.get(params, "payment_status")

    base =
      Client
      |> Client.for_business(business_id)
      |> Client.search(search_term)
      |> Client.with_status(status)
      |> Client.with_payment_status(payment_status)

    count = Repo.aggregate(base, :count, :id)
    summary = Client.summary(Client.for_business(business_id))

    clients =
      base
      |> Client.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Client.with_preloads()
      |> Repo.all()

    conn
    |> put_status(:ok)
    |> render(:index, count: count, clients: clients, summary: summary)
  end
end
