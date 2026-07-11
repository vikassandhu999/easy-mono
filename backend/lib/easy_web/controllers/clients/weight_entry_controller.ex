defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.WeightEntries
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, WeightEntryListResponse, WeightEntryRequest, WeightEntryResponse}
  alias OpenApiSpex.Operation

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :delete]

  tags ["client weight entries"]

  operation :index,
    summary: "List weight entries",
    operation_id: "listWeightEntries",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:since, :query, :string, "Only entries since this date", required: false)],
    responses: [ok: {"Weight entries", "application/json", WeightEntryListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :create,
    summary: "Create weight entry",
    operation_id: "createWeightEntry",
    security: [%{"bearerAuth" => []}],
    request_body: {"Weight entry request", "application/json", WeightEntryRequest, required: true},
    responses: [
      created: {"Weight entry created", "application/json", WeightEntryResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete weight entry",
    operation_id: "deleteWeightEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Weight entry id")],
    responses: [no_content: "Weight entry deleted", unauthorized: {"Unauthorized", "application/json", ErrorResponse}, not_found: {"Not found", "application/json", ErrorResponse}]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    with {:ok, %{client: client, entries: entries}} <-
           WeightEntries.list_client_weight_entries(conn.assigns.ctx, since: params["since"]) do
      render(conn, :index, entries: entries, client: client)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, entry} <- WeightEntries.upsert_client_weight_entry(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, weight_entry: entry)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    entry_id = conn.path_params["id"]

    with {:ok, _deleted} <- WeightEntries.delete_client_weight_entry(conn.assigns.ctx, entry_id) do
      send_resp(conn, :no_content, "")
    end
  end
end
