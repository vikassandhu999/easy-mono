defmodule EasyWeb.Public.LandingPageController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Landing
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    PublicApplicationRequest,
    PublicApplicationResponse,
    PublicLandingPageResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:apply]

  tags ["public landing page"]

  operation :show,
    summary: "Get public landing page",
    description: "Loads a published landing page by slug. No authentication.",
    operation_id: "getPublicLandingPage",
    parameters: [Operation.parameter(:slug, :path, :string, "Landing page slug")],
    responses: [
      ok: {"Landing page", "application/json", PublicLandingPageResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :apply,
    summary: "Submit application",
    description: "Submits a public application, creating a prospect. No authentication.",
    operation_id: "submitApplication",
    parameters: [Operation.parameter(:slug, :path, :string, "Landing page slug")],
    request_body: {"Application request", "application/json", PublicApplicationRequest, required: true},
    responses: [
      created: {"Application received", "application/json", PublicApplicationResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"slug" => slug}) do
    with {:ok, result} <- Landing.preview_landing_page(slug) do
      render(conn, :show, result: result)
    end
  end

  @spec apply(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def apply(conn, _params) do
    slug = conn.path_params["slug"]

    with {:ok, result} <- Landing.submit_application(slug, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:apply, result: result)
    end
  end
end
