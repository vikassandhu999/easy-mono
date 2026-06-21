defmodule EasyWeb.Clients.ClientProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias Easy.Clients

  alias EasyWeb.OpenApi.Schemas.{
    ClientCoachingProfileResponse,
    ClientCoachingProfileUpdateRequest,
    ErrorResponse
  }

  tags ["client coaching profile"]

  operation :show,
    summary: "Get client coaching profile",
    description: "Loads or creates the authenticated client's coaching profile.",
    operation_id: "getClientCoachingProfile",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Client coaching profile", "application/json", ClientCoachingProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client coaching profile",
    description: "Updates the authenticated client's structured coaching profile sections.",
    operation_id: "updateClientCoachingProfile",
    security: [%{"bearerAuth" => []}],
    request_body: {"Client profile update request", "application/json", ClientCoachingProfileUpdateRequest, required: true},
    responses: [
      ok: {"Client coaching profile updated", "application/json", ClientCoachingProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.get_client_for_user(business_id, user_id),
         {:ok, profile} <- ClientProfiles.get_or_create_profile(business_id, client.id) do
      render(conn, :show, profile: profile)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.get_client_for_user(business_id, user_id),
         {:ok, profile} <-
           ClientProfiles.update_profile_sections(business_id, client.id, conn.body_params) do
      render(conn, :show, profile: profile)
    end
  end
end
