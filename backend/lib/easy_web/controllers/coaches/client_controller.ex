defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller

  alias Easy.Clients

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, params) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.invite_client(business_id, user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, client} <- Clients.fetch_client_with_preloads(business_id, client_id) do
      render(conn, :show, client: client)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, updated_client} <- Clients.update_client(business_id, client_id, conn.body_params) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, _deleted} <- Clients.revoke_invitation(business_id, client_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, %{"id" => client_id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, updated_client} <- Clients.resend_invitation(business_id, user_id, client_id) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    business_id = conn.assigns.claims.business_id

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = Map.get(params, "status")

    with {:ok, %{clients: clients, count: count, summary: summary}} <-
           Clients.list_clients(business_id, search_term, status, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, clients: clients, summary: summary)
    end
  end
end
