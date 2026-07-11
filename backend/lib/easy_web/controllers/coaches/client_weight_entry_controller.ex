defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.WeightEntries
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, WeightEntryListResponse}
  alias OpenApiSpex.Operation

  tags ["coach client weight entries"]

  operation :index,
    summary: "List client weight entries",
    operation_id: "listClientWeightEntries",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:since, :query, :string, "Only entries since this date", required: false)
    ],
    responses: [
      ok: {"Weight entries", "application/json", WeightEntryListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    client_id = conn.path_params["client_id"]

    with {:ok, %{client: client, entries: entries, adherence: adherence}} <-
           WeightEntries.list_entries_for_client(conn.assigns.ctx, client_id, since: params["since"]) do
      render(conn, :index, entries: entries, client: client, adherence: adherence)
    end
  end
end
