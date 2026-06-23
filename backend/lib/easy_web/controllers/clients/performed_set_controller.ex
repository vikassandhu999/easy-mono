defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, TrainingPerformedSetRequest, TrainingPerformedSetResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["client performed sets"]

  operation :create,
    summary: "Log a performed set",
    operation_id: "createClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:session_id, :path, :string, "Training session id")],
    request_body: {"Performed set request", "application/json", TrainingPerformedSetRequest, required: true},
    responses: [
      created: {"Performed set created", "application/json", TrainingPerformedSetResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update a performed set",
    operation_id: "updateClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Performed set id")],
    request_body: {"Performed set request", "application/json", TrainingPerformedSetRequest, required: true},
    responses: [
      ok: {"Performed set updated", "application/json", TrainingPerformedSetResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete a performed set",
    operation_id: "deleteClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Performed set id")],
    responses: [
      no_content: "Performed set deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    session_id = conn.path_params["session_id"]

    with {:ok, set} <- Sessions.create_client_performed_set(conn.assigns.ctx, session_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, updated} <- Sessions.update_client_performed_set(conn.assigns.ctx, id, conn.body_params) do
      render(conn, :show, set: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _set} <- Sessions.delete_client_performed_set(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
