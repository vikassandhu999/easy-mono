defmodule EasyWeb.Public.LandingPageController do
  use EasyWeb, :typed_controller

  alias Easy.Landing
  alias EasyWeb.Types.LandingPage

  typed(:show, ok: {200, data(LandingPage.public())})
  typed(:apply, body: LandingPage.application(), ok: {201, data(LandingPage.application_result())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"slug" => slug}) do
    with {:ok, %{page: page, business: business}} <- Landing.preview_landing_page(slug) do
      ok(conn, %{data: LandingPage.public(page, business)})
    end
  end

  @spec apply(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def apply(conn, _params) do
    slug = conn.path_params["slug"]

    with {:ok, result} <- Landing.submit_application(slug, conn.body_params) do
      ok(conn, %{data: LandingPage.application(result)})
    end
  end
end
