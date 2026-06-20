defmodule EasyWeb.Coaches.ClientController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Clients
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ClientInviteRequest,
    ClientListResponse,
    ClientResponse,
    ClientUpdateRequest,
    ErrorResponse
  }

  tags ["coach clients"]

  operation :invite,
    summary: "Invite client",
    description: "Creates a pending client invitation in the authenticated business.",
    operation_id: "inviteClient",
    security: [%{"bearerAuth" => []}],
    request_body: {"Client invite request", "application/json", ClientInviteRequest, required: true},
    responses: [
      created: {"Client invited", "application/json", ClientResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Conflict", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :resend_invite,
    summary: "Resend client invitation",
    description: "Refreshes and resends a pending client invitation.",
    operation_id: "resendClientInvite",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    responses: [
      ok: {"Client", "application/json", ClientResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client",
    description: "Loads one client in the authenticated business.",
    operation_id: "getClient",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    responses: [
      ok: {"Client", "application/json", ClientResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client",
    description: "Updates coach-editable client fields and allowed status transitions.",
    operation_id: "updateClient",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    request_body: {"Client update request", "application/json", ClientUpdateRequest, required: true},
    responses: [
      ok: {"Client updated", "application/json", ClientResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Revoke client invitation",
    description: "Deletes a pending client invitation and related pending assignments.",
    operation_id: "deleteClient",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    responses: [
      no_content: "Client invitation revoked",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List clients",
    description: "Lists clients in the authenticated business with status summary counts.",
    operation_id: "listClients",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of clients to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum clients to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive client search", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "pending", "inactive", "archived"]},
        "Only clients with this status",
        required: false
      ),
      Operation.parameter(
        :profile_filter,
        :query,
        %Schema{
          type: :object,
          additionalProperties: true,
          properties: %{
            general: %Schema{type: :object, additionalProperties: true},
            nutrition: %Schema{type: :object, additionalProperties: true},
            training: %Schema{type: :object, additionalProperties: true},
            lifestyle: %Schema{type: :object, additionalProperties: true},
            custom: %Schema{type: :object, additionalProperties: true}
          }
        },
        "Nested profile filters using deepObject syntax. Example: profile_filter[nutrition][goal]=fat_loss or profile_filter[custom][meal_prep_ability]=high. Values may be scalar or repeated list values; list values match any selected value.",
        required: false,
        style: :deepObject,
        explode: true
      )
    ],
    responses: [
      ok: {"Clients", "application/json", ClientListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, params) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.invite_client(business_id, user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, client} <- Clients.get_client_with_preloads(business_id, client_id) do
      render(conn, :show, client: client)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, updated_client} <- Clients.update_client(business_id, client_id, conn.body_params) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, _deleted} <- Clients.revoke_invitation(business_id, client_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, %{"id" => client_id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, updated_client} <- Clients.resend_invitation(business_id, user_id, client_id) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    business_id = conn.assigns.claims.business_id

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = Map.get(params, "status")
    profile_filter = Map.get(params, "profile_filter", %{})

    with {:ok, %{clients: clients, count: count, summary: summary}} <-
           Clients.list_clients(business_id, search_term, status, offset, limit, profile_filter) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, clients: clients, summary: summary)
    end
  end
end
