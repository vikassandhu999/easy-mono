defmodule EasyWeb.Coaches.FormAssignmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentListResponse,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormAssignmentUpdateRequest,
    ErrorResponse
  }

  tags ["coach form assignments"]

  operation :index,
    summary: "List client form assignments",
    description: "Lists form assignments for a client in the authenticated coach business.",
    operation_id: "listClientFormAssignmentsForCoach",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    responses: [
      ok: {"Form assignments", "application/json", ClientProfileFormAssignmentListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update form assignment",
    description: "Updates a form assignment in the authenticated coach business.",
    operation_id: "updateFormAssignment",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form assignment id")],
    request_body: {"Form assignment update request", "application/json", ClientProfileFormAssignmentUpdateRequest, required: true},
    responses: [
      ok: {"Form assignment updated", "application/json", ClientProfileFormAssignmentResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, assignments} <- ClientProfiles.list_form_assignments_for_client(business_id, client_id) do
      render(conn, :index, assignments: assignments)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id}) do
    business_id = conn.assigns.claims.business_id

    with {:ok, assignment} <- ClientProfiles.update_form_assignment(business_id, id, conn.body_params) do
      render(conn, :show, assignment: assignment)
    end
  end
end
