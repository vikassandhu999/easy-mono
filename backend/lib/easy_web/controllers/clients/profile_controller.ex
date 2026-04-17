defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Training.Streak

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, profile} <- Client.get_profile(business_id, user_id) do
      streak = Streak.compute(business_id, profile.client.id, Date.utc_today())
      render(conn, :show, profile: profile, workout_streak: streak)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- Client.get_for_user(business_id, user_id),
         {:ok, _updated} <- Client.self_update(client, params),
         {:ok, profile} <- Client.get_profile(business_id, user_id) do
      streak = Streak.compute(business_id, profile.client.id, Date.utc_today())
      render(conn, :show, profile: profile, workout_streak: streak)
    end
  end
end
