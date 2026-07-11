defmodule EasyWeb.Coaches.ProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Coaches
  alias EasyWeb.OpenApi.Schemas.{CoachProfileResponse, CoachProfileUpdateRequest, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach profile"]

  operation :show,
    summary: "Get coach profile",
    description: "Loads the authenticated coach profile and business summary.",
    operation_id: "getCoachProfile",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Coach profile", "application/json", CoachProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update coach profile",
    description: "Updates the authenticated coach profile.",
    operation_id: "updateCoachProfile",
    security: [%{"bearerAuth" => []}],
    request_body: {"Coach profile update request", "application/json", CoachProfileUpdateRequest, required: true},
    responses: [
      ok: {"Coach profile updated", "application/json", CoachProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, coach} <- Coaches.get_coach(conn.assigns.ctx) do
      render(conn, :show, coach: coach)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, coach} <- Coaches.update_profile(conn.assigns.ctx, conn.body_params) do
      render(conn, :show, coach: coach)
    end
  end
end
