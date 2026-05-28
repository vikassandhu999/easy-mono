defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller

  alias Easy.Clients

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, profile} <- Clients.get_profile(business_id, user_id) do
      render(conn, :show, profile: profile)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, profile} <- Clients.update_profile(business_id, user_id, params) do
      render(conn, :show, profile: profile)
    end
  end
end
