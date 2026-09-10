defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :typed_controller

  alias Easy.ClientInvitations
  alias Easy.Clients
  alias EasyWeb.Types.Client, as: ClientType
  alias EasyWeb.Types.ClientIndex

  typed(:invite, body: ClientType.invite(), ok: {201, data(ClientType.t())})
  typed(:resend_invite, ok: {200, data(ClientType.t())})
  typed(:show, ok: {200, data(ClientType.t())})
  typed(:update, body: ClientType.update(), ok: {200, data(ClientType.t())})
  typed(:delete, ok: {204, nil})
  typed(:reassign, body: ClientType.reassign(), ok: {200, data(ClientType.t())})
  typed(:index, query: ClientType.list_query(), ok: {200, ClientIndex.t()})

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, _params) do
    with {:ok, client} <- ClientInvitations.invite(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: client})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, client} <- Clients.get_client_with_preloads(conn.assigns.ctx, client_id) do
      ok(conn, %{data: client})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, updated_client} <- Clients.update_client(conn.assigns.ctx, client_id, conn.body_params) do
      ok(conn, %{data: updated_client})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, _deleted} <- ClientInvitations.revoke_invitation(conn.assigns.ctx, client_id) do
      ok(conn)
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, updated_client} <- ClientInvitations.resend_invitation(conn.assigns.ctx, client_id) do
      ok(conn, %{data: updated_client})
    end
  end

  @spec reassign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reassign(conn, _params) do
    client_id = conn.path_params["id"]
    %{coach_id: coach_id} = conn.body_params

    with {:ok, client} <- Clients.reassign_client(conn.assigns.ctx, client_id, coach_id) do
      ok(conn, %{data: client})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      cursor: Map.get(params, "cursor"),
      search: Map.get(params, "search", ""),
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20),
      status: Map.get(params, "status"),
      stage: Map.get(params, "stage"),
      sort: Map.get(params, "sort", :newest),
      include_plans: Map.get(params, "include_plans", false)
    ]

    with {:ok, page} <- Clients.list_client_page(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end
end
