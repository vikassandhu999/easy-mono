defmodule EasyWeb.Clients.PerformedSetController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Sessions
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, PerformedSetRequest, PerformedSetResponse}

  tags ["client performed sets"]

  operation :create,
    summary: "Create client performed set",
    operation_id: "createClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    request_body: {"Performed set request", "application/json", PerformedSetRequest, required: true},
    responses: [
      created: {"Performed set created", "application/json", PerformedSetResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update client performed set",
    operation_id: "updateClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Performed set id")],
    request_body: {"Performed set request", "application/json", PerformedSetRequest, required: true},
    responses: [
      ok: {"Performed set updated", "application/json", PerformedSetResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete client performed set",
    operation_id: "deleteClientPerformedSet",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Performed set id")],
    responses: [no_content: "Performed set deleted", unauthorized: {"Unauthorized", "application/json", ErrorResponse}, not_found: {"Not found", "application/json", ErrorResponse}]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"workout_session_id" => session_id} = params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, set} <-
           Sessions.create_client_performed_set_for_user(business_id, user_id, session_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, set: set)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, updated} <-
           Sessions.update_client_performed_set_for_user(
             business_id,
             user_id,
             id,
             conn.body_params
           ) do
      render(conn, :show, set: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, _set} <- Sessions.delete_client_performed_set_for_user(business_id, user_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
