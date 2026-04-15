defmodule EasyWeb.Coaches.ProfileController do
  use EasyWeb, :controller

  alias Easy.Orgs.Coach

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, coach} <- Coach.get_for_user(business_id, user_id) do
      render(conn, :show, coach: coach)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, coach} <- Coach.get_for_user(business_id, user_id),
         {:ok, coach} <- Coach.update_profile(coach, params) do
      render(conn, :show, coach: coach)
    end
  end
end
