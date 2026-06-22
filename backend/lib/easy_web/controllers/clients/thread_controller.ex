defmodule EasyWeb.Clients.ThreadController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Threads

  alias EasyWeb.OpenApi.Schemas.{
    ClientThreadCreateRequest,
    ErrorResponse,
    ThreadDetailResponse,
    ThreadListResponse,
    ThreadResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create]

  tags ["client threads"]

  operation :index,
    summary: "List my threads",
    operation_id: "listClientThreads",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Threads", "application/json", ThreadListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get one of my threads",
    operation_id: "getClientThread",
    security: [%{"bearerAuth" => []}],
    parameters: [OpenApiSpex.Operation.parameter(:id, :path, :string, "Thread id")],
    responses: [
      ok: {"Thread", "application/json", ThreadDetailResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Start a thread",
    operation_id: "createClientThread",
    security: [%{"bearerAuth" => []}],
    request_body: {"Thread", "application/json", ClientThreadCreateRequest, required: true},
    responses: [
      created: {"Thread", "application/json", ThreadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, threads} <- Threads.list_threads_for_user(conn.assigns.ctx) do
      render(conn, :index, threads: threads)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, thread} <- Threads.get_thread_for_user(conn.assigns.ctx, id) do
      render(conn, :show, thread: thread)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, thread} <- Threads.create_thread_as_client(conn.assigns.ctx, conn.body_params) do
      conn |> put_status(:created) |> render(:show, thread: thread)
    end
  end
end
