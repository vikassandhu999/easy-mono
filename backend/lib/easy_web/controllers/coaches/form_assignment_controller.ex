defmodule EasyWeb.Coaches.FormAssignmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentListResponse,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormAssignmentUpdateRequest,
    ClientProfileFormSubmissionListResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

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

  operation :submissions,
    summary: "List form submissions",
    description: "Lists submissions (answers) for a form assignment in the authenticated coach business.",
    operation_id: "listFormSubmissions",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form assignment id")],
    responses: [
      ok: {"Form submissions", "application/json", ClientProfileFormSubmissionListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignments} <- ClientProfiles.list_form_assignments_for_client(ctx, client_id) do
      render(conn, :index, assignments: assignments)
    end
  end

  @spec submissions(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submissions(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submissions} <- ClientProfiles.list_form_submissions(ctx, id) do
      render(conn, :submissions, submissions: submissions)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, assignment} <- ClientProfiles.update_form_assignment(ctx, id, conn.body_params) do
      render(conn, :show, assignment: assignment)
    end
  end
end
