defmodule EasyWeb.Coaches.WorkbenchController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Workbench
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, QueueSnoozeRequest, WorkbenchCountsResponse}
  alias OpenApiSpex.Operation

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:snooze]

  tags ["coach workbench"]

  operation :index,
    summary: "Workbench queue counts",
    description:
      "Total items remaining in each workbench queue (work left, not unreads): unreviewed check-in submissions, clients needing programming, subscriptions expiring within 7 days, and clients in onboarding.",
    operation_id: "getWorkbenchCounts",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Workbench counts", "application/json", WorkbenchCountsResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, counts} <- Workbench.counts(conn.assigns.ctx) do
      render(conn, :index, counts: counts)
    end
  end

  operation :snooze,
    summary: "Snooze a workbench queue for a client",
    description:
      "Hides the client from the given queue (and its count) until the date passes, then they reappear automatically. Re-snoozing replaces the date. Only the `quiet` and `expiring` queues snooze.",
    operation_id: "snoozeWorkbenchQueue",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Client id")
    ],
    request_body: {"Queue snooze request", "application/json", QueueSnoozeRequest, required: true},
    responses: [
      no_content: "Snoozed",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec snooze(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def snooze(conn, _params) do
    client_id = conn.path_params["id"]

    with {:ok, _snooze} <- Workbench.snooze_queue_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      send_resp(conn, :no_content, "")
    end
  end
end
