defmodule EasyWeb.Coaches.ProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Orgs.Coach
  alias EasyWeb.OpenApi.Schemas.{CoachProfileResponse, CoachProfileUpdateRequest, ErrorResponse}

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
