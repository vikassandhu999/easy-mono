defmodule EasyWeb.Coaches.ProspectController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Landing
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    ProspectEnrollRequest,
    ProspectEnrollResponse,
    ProspectListResponse,
    ProspectResponse,
    ProspectUpdateRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update, :enroll]

  tags ["coach prospects"]

  operation :index,
    summary: "List prospects",
    description: "Lists prospects in the authenticated coach business, optionally filtered by status.",
    operation_id: "listProspects",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:status, :query, :string, "Filter by status"),
      Operation.parameter(:offset, :query, :integer, "Pagination offset"),
      Operation.parameter(:limit, :query, :integer, "Page size (max 100)")
    ],
    responses: [
      ok: {"Prospects", "application/json", ProspectListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get prospect",
    operation_id: "getProspect",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Prospect id")],
    responses: [
      ok: {"Prospect", "application/json", ProspectResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update prospect",
    description: "Updates prospect status or notes.",
    operation_id: "updateProspect",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Prospect id")],
    request_body: {"Prospect update request", "application/json", ProspectUpdateRequest, required: true},
    responses: [
      ok: {"Prospect updated", "application/json", ProspectResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :enroll,
    summary: "Enroll prospect",
    description:
      "Creates a pending client from the prospect, sends the invite, and marks it won. " <>
        "Already-enrolled prospects return the linked client without creating another.",
    operation_id: "enrollProspect",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Prospect id")],
    request_body: {"Enroll request", "application/json", ProspectEnrollRequest, required: true},
    responses: [
      created: {"Prospect enrolled", "application/json", ProspectEnrollResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts =
      [status: params["status"]]
      |> maybe_int(:offset, params["offset"])
      |> maybe_int(:limit, params["limit"])

    with {:ok, result} <- Landing.list_prospects(conn.assigns.ctx, opts) do
      render(conn, :index, result: result)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, prospect} <- Landing.get_prospect(conn.assigns.ctx, id) do
      render(conn, :show, prospect: prospect)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, prospect} <- Landing.update_prospect(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, prospect: prospect)
    end
  end

  @spec enroll(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def enroll(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, result} <- Landing.enroll_prospect(conn.assigns.ctx, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:enroll, result: result)
    end
  end

  defp maybe_int(opts, _key, nil), do: opts

  defp maybe_int(opts, key, value) do
    case Integer.parse(to_string(value)) do
      {int, _} -> Keyword.put(opts, key, int)
      :error -> opts
    end
  end
end
