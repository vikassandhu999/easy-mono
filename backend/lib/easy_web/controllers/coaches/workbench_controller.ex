defmodule EasyWeb.Coaches.WorkbenchController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Workbench

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    QueueSnoozeRequest,
    WorkbenchCheckInQueueResponse,
    WorkbenchCountsResponse,
    WorkbenchExpiringQueueResponse,
    WorkbenchOnboardingQueueResponse,
    WorkbenchProgrammingQueueResponse,
    WorkbenchQuietQueueResponse,
    WorkbenchRepliesQueueResponse
  }

  alias OpenApiSpex.Operation

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:snooze]

  tags ["coach workbench"]

  @pagination_parameters [
    Operation.parameter(:offset, :query, :integer, "Offset", required: false),
    Operation.parameter(:limit, :query, :integer, "Limit (max 100)", required: false)
  ]

  operation :index,
    summary: "Workbench queue counts",
    description: "Total items remaining in each explicit workbench queue (work left, not unread indicators).",
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

  operation :onboarding,
    summary: "List onboarding work",
    operation_id: "listWorkbenchOnboardingQueue",
    security: [%{"bearerAuth" => []}],
    parameters: @pagination_parameters,
    responses: [
      ok: {"Onboarding queue", "application/json", WorkbenchOnboardingQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec onboarding(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def onboarding(conn, params) do
    with {:ok, %{items: items, count: count}} <-
           Workbench.list_onboarding_queue(conn.assigns.ctx, pagination_opts(params)) do
      render(conn, :onboarding, items: items, count: count)
    end
  end

  operation :programming,
    summary: "List programming work",
    operation_id: "listWorkbenchProgrammingQueue",
    security: [%{"bearerAuth" => []}],
    parameters:
      @pagination_parameters ++
        [
          Operation.parameter(
            :service,
            :query,
            %OpenApiSpex.Schema{
              type: :string,
              enum: ["all", "training", "nutrition"],
              default: "all"
            },
            "Required service",
            required: false
          )
        ],
    responses: [
      ok: {"Programming queue", "application/json", WorkbenchProgrammingQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid service", "application/json", ErrorResponse}
    ]

  @spec programming(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def programming(conn, params) do
    opts = Keyword.put(pagination_opts(params), :service, params["service"] || "all")

    with {:ok, %{items: items, count: count}} <-
           Workbench.list_programming_queue(conn.assigns.ctx, opts) do
      render(conn, :programming, items: items, count: count)
    end
  end

  operation :expiring,
    summary: "List expiring engagement work",
    operation_id: "listWorkbenchExpiringQueue",
    security: [%{"bearerAuth" => []}],
    parameters: @pagination_parameters,
    responses: [
      ok: {"Expiring queue", "application/json", WorkbenchExpiringQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec expiring(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def expiring(conn, params), do: render_client_queue(conn, :expiring, params)

  operation :quiet,
    summary: "List missed check-in follow-up work",
    operation_id: "listWorkbenchQuietQueue",
    security: [%{"bearerAuth" => []}],
    parameters: @pagination_parameters,
    responses: [
      ok: {"Quiet queue", "application/json", WorkbenchQuietQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec quiet(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def quiet(conn, params), do: render_client_queue(conn, :quiet, params)

  operation :check_ins,
    summary: "List check-in submissions awaiting review",
    operation_id: "listWorkbenchCheckInQueue",
    security: [%{"bearerAuth" => []}],
    parameters: @pagination_parameters,
    responses: [
      ok: {"Check-ins queue", "application/json", WorkbenchCheckInQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec check_ins(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def check_ins(conn, params) do
    with {:ok, %{items: items, count: count}} <-
           Workbench.list_check_in_queue(conn.assigns.ctx, pagination_opts(params)) do
      render(conn, :check_ins, items: items, count: count)
    end
  end

  operation :replies,
    summary: "List conversations awaiting a coach response",
    operation_id: "listWorkbenchRepliesQueue",
    security: [%{"bearerAuth" => []}],
    parameters: @pagination_parameters,
    responses: [
      ok: {"Replies queue", "application/json", WorkbenchRepliesQueueResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec replies(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replies(conn, params) do
    with {:ok, %{items: items, count: count}} <-
           Workbench.list_replies_queue(conn.assigns.ctx, pagination_opts(params)) do
      render(conn, :replies, items: items, count: count)
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

  defp render_client_queue(conn, queue, params) do
    list = if queue == :expiring, do: &Workbench.list_expiring_queue/2, else: &Workbench.list_quiet_queue/2

    with {:ok, %{items: items, count: count}} <- list.(conn.assigns.ctx, pagination_opts(params)) do
      render(conn, queue, items: items, count: count)
    end
  end

  defp pagination_opts(params) do
    [offset: parse_int(params["offset"]), limit: parse_int(params["limit"])]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end

  defp parse_int(nil), do: nil
  defp parse_int(value) when is_integer(value), do: value

  defp parse_int(value) when is_binary(value) do
    case Integer.parse(value) do
      {integer, ""} -> integer
      _error -> nil
    end
  end
end
