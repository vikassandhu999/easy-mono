defmodule EasyWeb.Coaches.ProfileFieldController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFieldListResponse,
    ClientProfileFieldRequest,
    ClientProfileFieldResponse,
    ClientProfileFieldUpdateRequest,
    ErrorResponse
  }

  tags ["coach profile fields"]

  operation :index,
    summary: "List profile fields",
    description: "Lists active custom profile fields in the authenticated coach business.",
    operation_id: "listProfileFields",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Profile fields", "application/json", ClientProfileFieldListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create profile field",
    description: "Creates a custom client profile field in the authenticated coach business.",
    operation_id: "createProfileField",
    security: [%{"bearerAuth" => []}],
    request_body: {"Profile field create request", "application/json", ClientProfileFieldRequest, required: true},
    responses: [
      created: {"Profile field created", "application/json", ClientProfileFieldResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update profile field",
    description: "Updates a custom client profile field in the authenticated coach business.",
    operation_id: "updateProfileField",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Profile field id")
    ],
    request_body: {"Profile field update request", "application/json", ClientProfileFieldUpdateRequest, required: true},
    responses: [
      ok: {"Profile field updated", "application/json", ClientProfileFieldResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete profile field",
    description: "Archives a custom client profile field in the authenticated coach business.",
    operation_id: "deleteProfileField",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Profile field id")
    ],
    responses: [
      no_content: "Profile field archived",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    business_id = conn.assigns.claims.business_id

    with {:ok, fields} <- ClientProfiles.list_profile_fields(business_id) do
      render(conn, :index, fields: fields)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    business_id = conn.assigns.claims.business_id

    with {:ok, field} <- ClientProfiles.create_profile_field(business_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, field: field)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, field} <- ClientProfiles.update_profile_field(business_id, id, conn.body_params) do
      render(conn, :show, field: field)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, _field} <- ClientProfiles.archive_profile_field(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
