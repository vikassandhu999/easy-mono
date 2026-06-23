defmodule EasyWeb.BusinessController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Identity.Users
  alias Easy.Orgs
  alias EasyWeb.OpenApi.Schemas.{BusinessRequest, BusinessResponse, BusinessUpdateRequest, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["businesses"]

  operation :create,
    summary: "Create business",
    description: "Creates a business for the authenticated user.",
    operation_id: "createBusiness",
    security: [%{"bearerAuth" => []}],
    request_body: {"Business create request", "application/json", BusinessRequest, required: true},
    responses: [
      created: {"Business created", "application/json", BusinessResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get current business",
    description: "Loads the authenticated coach business.",
    operation_id: "getCurrentBusiness",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Business", "application/json", BusinessResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update current business",
    description: "Updates the authenticated coach business profile.",
    operation_id: "updateCurrentBusiness",
    security: [%{"bearerAuth" => []}],
    request_body: {"Business update request", "application/json", BusinessUpdateRequest, required: true},
    responses: [
      ok: {"Business updated", "application/json", BusinessResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    # pre-auth onboarding path: ctx.user_id exists but business not yet created
    with {:ok, user} <- Users.get_by_id(conn.assigns.ctx.user_id),
         {:ok, business} <- Orgs.create_business(user, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, business: business)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, business} <- Orgs.get_business(conn.assigns.ctx) do
      conn
      |> put_status(:ok)
      |> render(:show, business: business)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, business} <- Orgs.update_business(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:show, business: business)
    end
  end
end
