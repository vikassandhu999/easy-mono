defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.WeightEntries
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, WeightEntryListResponse}

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
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, %{client: client, entries: entries, adherence: adherence}} <-
           WeightEntries.list_entries_for_client(business_id, client_id, Map.get(params, "since")) do
      render(conn, :index, entries: entries, client: client, adherence: adherence)
    end
  end
end
