defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Clients
  alias EasyWeb.Types.ClientProfile

  typed(:show, ok: {200, data(ClientProfile.t())})

  typed(:update, body: ClientProfile.update(), ok: {200, data(ClientProfile.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, profile} <- Clients.get_client_account_profile(conn.assigns.ctx) do
      ok(conn, %{data: profile})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, profile} <- Clients.update_client_account_profile(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: profile})
    end
  end
end
