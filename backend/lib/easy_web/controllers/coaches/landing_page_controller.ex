defmodule EasyWeb.Coaches.LandingPageController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Landing
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, LandingPageResponse, LandingPageUpsertRequest}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach landing page"]

  operation :show,
    summary: "Get landing page",
    description: "Loads the authenticated coach business landing page, or null if none exists yet.",
    operation_id: "getLandingPage",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Landing page", "application/json", LandingPageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Save landing page",
    description: "Upserts the landing page (page fields, programs, and questions) in one request.",
    operation_id: "saveLandingPage",
    security: [%{"bearerAuth" => []}],
    request_body: {"Landing page upsert request", "application/json", LandingPageUpsertRequest, required: true},
    responses: [
      ok: {"Landing page saved", "application/json", LandingPageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, page} <- Landing.get_landing_page(conn.assigns.ctx) do
      render(conn, :show, page: page)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, page} <- Landing.upsert_landing_page(conn.assigns.ctx, conn.body_params) do
      render(conn, :show, page: page)
    end
  end
end
