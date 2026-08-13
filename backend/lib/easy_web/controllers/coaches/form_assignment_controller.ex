defmodule EasyWeb.Coaches.FormAssignmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Forms
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentListResponse,
    ClientProfileFormAssignmentRequest,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormAssignmentUpdateRequest,
    ClientProfileFormSubmissionListResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :update, :remind]

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

  operation :create,
    summary: "Assign a form template to a client",
    description: "Creates a form assignment for a client in the authenticated coach business.",
    operation_id: "createClientFormAssignment",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    request_body: {"Form assignment request", "application/json", ClientProfileFormAssignmentRequest, required: true},
    responses: [
      created: {"Form assignment created", "application/json", ClientProfileFormAssignmentResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
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

  operation :remind,
    summary: "Send an Intake reminder",
    description: "Sends a reminder without changing the assignment status or Workbench queue membership.",
    operation_id: "remindClientFormAssignment",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form assignment id")],
    responses: [
      no_content: "Reminder sent",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignments} <- Forms.list_form_assignments_for_client(ctx, client_id) do
      render(conn, :index, assignments: assignments)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    ctx = conn.assigns.ctx
    client_id = conn.path_params["client_id"]
    template_id = conn.body_params[:form_template_id]

    with {:ok, assignment} <- Forms.assign_form_template_to_client(ctx, client_id, template_id, %{}) do
      conn
      |> put_status(:created)
      |> render(:show, assignment: assignment)
    end
  end

  @spec submissions(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submissions(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submissions} <- Forms.list_form_submissions(ctx, id) do
      render(conn, :submissions, submissions: submissions)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, assignment} <- Forms.update_form_assignment(ctx, id, conn.body_params) do
      render(conn, :show, assignment: assignment)
    end
  end

  @spec remind(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remind(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _assignment} <- Forms.send_intake_reminder(conn.assigns.ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
