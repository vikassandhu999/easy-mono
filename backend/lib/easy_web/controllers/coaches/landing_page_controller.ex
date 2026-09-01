defmodule EasyWeb.Coaches.LandingPageController do
  use EasyWeb, :typed_controller

  alias Easy.Landing
  alias EasyWeb.Types.LandingPage

  typed(:show, ok: {200, data(LandingPage.t() | nil)})
  typed(:update, body: LandingPage.upsert(), ok: {200, data(LandingPage.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, page} <- Landing.get_landing_page(conn.assigns.ctx) do
      ok(conn, %{data: page})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, page} <- Landing.upsert_landing_page(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: page})
    end
  end
end
