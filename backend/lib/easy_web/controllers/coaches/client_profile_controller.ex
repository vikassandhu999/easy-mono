defmodule EasyWeb.Coaches.ClientProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    CoachingClientProfileRequest,
    CoachingClientProfileResponse,
    ErrorResponse
  }

  tags ["coach client profiles"]

  operation :show,
    summary: "Get client profile",
    description: "Loads or creates the coaching profile for one client in the authenticated business.",
    operation_id: "getCoachingClientProfile",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id")
    ],
    responses: [
      ok: {"Client profile", "application/json", CoachingClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client profile",
    description: "Updates the structured coaching profile sections for one client in the authenticated business.",
    operation_id: "updateCoachingClientProfile",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id")
    ],
    request_body: {"Client profile update request", "application/json", CoachingClientProfileRequest, required: true},
    responses: [
      ok: {"Client profile updated", "application/json", CoachingClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"client_id" => client_id}) do
    ctx = conn.assigns.ctx

    with {:ok, profile} <- ClientProfiles.get_or_create_profile(ctx, client_id) do
      render(conn, :show, profile: profile)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    client_id = conn.path_params["client_id"]

    with {:ok, profile} <- ClientProfiles.update_profile(ctx, client_id, conn.body_params) do
      render(conn, :show, profile: profile)
    end
  end
end
