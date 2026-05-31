defmodule EasyWeb.Clients.ProfileController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Clients
  alias EasyWeb.OpenApi.Schemas.{ClientProfileResponse, ClientProfileUpdateRequest, ErrorResponse}

  tags ["client profile"]

  operation :show,
    summary: "Get client profile",
    description: "Loads the authenticated client profile and coach summary.",
    operation_id: "getClientProfile",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Client profile", "application/json", ClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client profile",
    description: "Updates the authenticated client profile.",
    operation_id: "updateClientProfile",
    security: [%{"bearerAuth" => []}],
    request_body: {"Client profile update request", "application/json", ClientProfileUpdateRequest, required: true},
    responses: [
      ok: {"Client profile updated", "application/json", ClientProfileResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, profile} <- Clients.get_profile(business_id, user_id) do
      render(conn, :show, profile: profile)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, profile} <- Clients.update_profile(business_id, user_id, params) do
      render(conn, :show, profile: profile)
    end
  end
end
