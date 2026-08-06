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
    ErrorResponse,
    ReassignClientRequest,
    SeatLimitError
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:invite, :resend_invite, :update, :delete, :reassign]

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
      conflict: {"Seat limit reached", "application/json", SeatLimitError},
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
      conflict: {"Seat limit reached", "application/json", SeatLimitError},
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

  operation :reassign,
    summary: "Reassign client",
    description: "Owner-only: reassigns a client to a different active trainer on the team.",
    operation_id: "reassignClient",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    request_body: {"Reassign client request", "application/json", ReassignClientRequest, required: true},
    responses: [
      ok: {"Client reassigned", "application/json", ClientResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Not the business owner", "application/json", ErrorResponse},
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
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive client search", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "pending", "inactive"]},
        "Only clients with this status",
        required: false
      ),
      Operation.parameter(
        :stage,
        :query,
        %Schema{type: :string, enum: ["onboarding", "coaching"]},
        "Only clients with this stage",
        required: false
      ),
      Operation.parameter(
        :sort,
        :query,
        %Schema{type: :string, enum: ["newest", "last_active"]},
        "Row order — newest first (default) or last client activity first",
        required: false
      ),
      Operation.parameter(
        :include_plans,
        :query,
        :boolean,
        "Include each client's in-force training and nutrition plan names. Off by default — it costs two extra queries per page and only the clients list renders them.",
        required: false
      ),
      Operation.parameter(
        :filter,
        :query,
        %Schema{type: :string, enum: ["programming", "expiring", "new", "quiet"]},
        "Restrict to one workbench queue. `programming`: active clients with no plan in force or coverage ending within 3 days (no-plan first, then soonest end). `expiring`: subscriptions ending within 7 days, minus snoozed (soonest first). `new`: added within 14 days, invite pending over 3 days, or intake incomplete (newest first). `quiet`: missed their last two scheduled sessions or latest check-in, minus snoozed (longest-quiet first). A queue imposes its own sort order.",
        required: false
      )
    ],
    responses: [
      ok: {"Clients", "application/json", ClientListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def invite(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, client} <- Clients.invite_client(ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, client: client)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, client} <- Clients.get_client_with_preloads(conn.assigns.ctx, client_id) do
      render(conn, :show, client: client)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, updated_client} <- Clients.update_client(conn.assigns.ctx, client_id, conn.body_params) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, _deleted} <- Clients.revoke_invitation(conn.assigns.ctx, client_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec resend_invite(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def resend_invite(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, updated_client} <- Clients.resend_invitation(conn.assigns.ctx, client_id) do
      render(conn, :show, client: updated_client)
    end
  end

  @spec reassign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def reassign(conn, _params) do
    client_id = conn.path_params["id"]
    %{coach_id: coach_id} = conn.body_params

    with {:ok, client} <- Clients.reassign_client(conn.assigns.ctx, client_id, coach_id) do
      render(conn, :show, client: client)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  # Mapped explicitly, never `String.to_atom/1` on a query param (AGENTS.md).
  defp parse_sort("last_active"), do: :last_active
  defp parse_sort(_other), do: :newest

  defp parse_filter("programming"), do: :programming
  defp parse_filter("expiring"), do: :expiring
  defp parse_filter("new"), do: :new
  defp parse_filter("quiet"), do: :quiet
  defp parse_filter(_other), do: nil

  # Normalized here rather than trusted from the cast: a query param reaches the
  # action as a string unless the spec has taught the cast otherwise, and the
  # context matches on a real boolean. Anything that isn't an explicit yes is no.
  defp parse_boolean(true), do: true
  defp parse_boolean("true"), do: true
  defp parse_boolean(_other), do: false

  def index(conn, params) do
    opts = [
      search: Map.get(params, "search", ""),
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 20),
      status: Map.get(params, "status"),
      stage: Map.get(params, "stage"),
      sort: parse_sort(Map.get(params, "sort")),
      filter: parse_filter(Map.get(params, "filter")),
      include_plans: parse_boolean(Map.get(params, "include_plans"))
    ]

    # Quiet membership is schedule-aware and lives in Workbench; every other
    # queue (and the plain roster) is one facts query in Clients.
    list =
      case opts[:filter] do
        :quiet -> Easy.Workbench.list_quiet_clients(conn.assigns.ctx, opts)
        _other -> Clients.list_clients(conn.assigns.ctx, opts)
      end

    with {:ok, %{clients: clients, count: count, summary: summary}} <- list do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, clients: clients, summary: summary)
    end
  end
end
