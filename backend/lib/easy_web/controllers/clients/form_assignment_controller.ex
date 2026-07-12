defmodule EasyWeb.Clients.FormAssignmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Forms
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentListResponse,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormSubmissionRequest,
    ClientProfileFormSubmissionResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:submit]

  tags ["client form assignments"]

  operation :index,
    summary: "List form assignments",
    description: "Lists form assignments for the authenticated client.",
    operation_id: "listClientFormAssignments",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Form assignments", "application/json", ClientProfileFormAssignmentListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Client not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get form assignment",
    description: "Loads one form assignment for the authenticated client.",
    operation_id: "getClientFormAssignment",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form assignment id")],
    responses: [
      ok: {"Form assignment", "application/json", ClientProfileFormAssignmentResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :submit,
    summary: "Submit form assignment",
    description: "Submits answers for a form assignment and applies profile mappings.",
    operation_id: "submitClientFormAssignment",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form assignment id")],
    request_body: {"Form submission request", "application/json", ClientProfileFormSubmissionRequest, required: true},
    responses: [
      created: {"Form submission created", "application/json", ClientProfileFormSubmissionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, assignments} <- Forms.list_client_form_assignments(ctx) do
      render(conn, :index, assignments: assignments)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignment} <- Forms.get_client_form_assignment(ctx, id) do
      render(conn, :show, assignment: assignment)
    end
  end

  @spec submit(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submit(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submission} <- Forms.submit_client_form_assignment(ctx, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:submission, submission: submission)
    end
  end
end
