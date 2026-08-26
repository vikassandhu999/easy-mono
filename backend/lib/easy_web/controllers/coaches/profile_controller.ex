defmodule EasyWeb.Coaches.ProfileController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Coaches
  alias EasyWeb.Types.CoachProfile

  typed(:show, ok: {200, data(CoachProfile.t())})
  typed(:update, body: CoachProfile.update(), ok: {200, data(CoachProfile.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, coach} <- Coaches.get_coach(conn.assigns.ctx) do
      ok(conn, %{data: coach})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, coach} <- Coaches.update_profile(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: coach})
    end
  end
end
