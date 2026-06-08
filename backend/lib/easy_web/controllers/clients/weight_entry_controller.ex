defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.WeightEntries
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, WeightEntryListResponse, WeightEntryRequest, WeightEntryResponse}

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
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, %{client: client, entries: entries}} <-
           WeightEntries.list_entries_for_user(business_id, user_id, Map.get(params, "since")) do
      render(conn, :index, entries: entries, client: client)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, entry} <- WeightEntries.upsert_for_user(business_id, user_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, weight_entry: entry)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- WeightEntries.delete_for_user(business_id, user_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
