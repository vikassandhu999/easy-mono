defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Repo

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id) do
      client = Repo.preload(client, [:user, :business, :creator, :offer])
      render(conn, :show, client: client)
    end
  end
end
