defmodule EasyWeb.Clients.FormAssignmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias Easy.Clients
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentListResponse,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormSubmissionRequest,
    ClientProfileFormSubmissionResponse,
    ErrorResponse
  }

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
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.get_client_for_user(business_id, user_id),
         {:ok, assignments} <- ClientProfiles.list_form_assignments_for_client(business_id, client.id) do
      render(conn, :index, assignments: assignments)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.get_client_for_user(business_id, user_id),
         {:ok, assignment} <- ClientProfiles.get_client_form_assignment(business_id, client.id, id) do
      render(conn, :show, assignment: assignment)
    end
  end

  @spec submit(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submit(conn, %{"id" => id}) do
    %{business_id: business_id, user_id: user_id} = conn.assigns.claims

    with {:ok, client} <- Clients.get_client_for_user(business_id, user_id),
         {:ok, submission} <- ClientProfiles.submit_form_assignment(business_id, client.id, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:submission, submission: submission)
    end
  end
end
