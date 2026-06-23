defmodule EasyWeb.Coaches.ThreadController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Threads
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    CoachThreadCreateRequest,
    ErrorResponse,
    ThreadDetailResponse,
    ThreadListResponse,
    ThreadResponse,
    ThreadUpdateRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["coach threads"]

  operation :index,
    summary: "List threads",
    operation_id: "listCoachThreads",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :query, :string, "Client filter", required: false),
      Operation.parameter(:module, :query, :string, "Module filter", required: false),
      Operation.parameter(:status, :query, :string, "Status filter", required: false),
      Operation.parameter(:priority, :query, :string, "Priority filter", required: false)
    ],
    responses: [
      ok: {"Threads", "application/json", ThreadListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :client_threads,
    summary: "List a client's threads",
    operation_id: "listCoachClientThreads",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    responses: [
      ok: {"Threads", "application/json", ThreadListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a thread with messages",
    operation_id: "getCoachThread",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Thread id")],
    responses: [
      ok: {"Thread", "application/json", ThreadDetailResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create a thread",
    operation_id: "createCoachThread",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    request_body: {"Thread", "application/json", CoachThreadCreateRequest, required: true},
    responses: [
      created: {"Thread", "application/json", ThreadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update a thread",
    operation_id: "updateCoachThread",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Thread id")],
    request_body: {"Thread update", "application/json", ThreadUpdateRequest, required: true},
    responses: [
      ok: {"Thread", "application/json", ThreadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts =
      params
      |> Map.take(["client_id", "module", "status", "priority"])
      |> Enum.map(fn {k, v} -> {String.to_existing_atom(k), v} end)

    with {:ok, %{threads: threads}} <- Threads.list_threads(conn.assigns.ctx, opts) do
      render(conn, :index, threads: threads)
    end
  end

  @spec client_threads(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def client_threads(conn, %{"client_id" => client_id}) do
    with {:ok, %{threads: threads}} <- Threads.list_threads_for_client(conn.assigns.ctx, client_id) do
      render(conn, :index, threads: threads)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, thread} <- Threads.get_thread(conn.assigns.ctx, id) do
      render(conn, :show, thread: thread)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, thread} <- Threads.create_thread_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      conn |> put_status(:created) |> render(:show, thread: thread)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, thread} <- Threads.update_thread(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      render(conn, :show, thread: thread)
    end
  end
end
