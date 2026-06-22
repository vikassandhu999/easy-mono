defmodule EasyWeb.Coaches.ThreadMessageController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Threads
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, ThreadMessageRequest, ThreadMessageResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create]

  tags ["coach threads"]

  operation :create,
    summary: "Post a message to a thread",
    operation_id: "createCoachThreadMessage",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:thread_id, :path, :string, "Thread id")],
    request_body: {"Message", "application/json", ThreadMessageRequest, required: true},
    responses: [
      created: {"Message", "application/json", ThreadMessageResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, message} <-
           Threads.add_message_as_coach(conn.assigns.ctx, conn.path_params["thread_id"], conn.body_params) do
      conn
      |> put_status(:created)
      |> put_view(json: EasyWeb.Coaches.ThreadJSON)
      |> render(:message, message: message)
    end
  end
end
