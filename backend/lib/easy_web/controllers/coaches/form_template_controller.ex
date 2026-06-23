defmodule EasyWeb.Coaches.FormTemplateController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormAssignmentAssignRequest,
    ClientProfileFormAssignmentResponse,
    ClientProfileFormTemplateListResponse,
    ClientProfileFormTemplateRequest,
    ClientProfileFormTemplateResponse,
    ClientProfileFormTemplateUpdateRequest,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update, :assign]

  tags ["coach form templates"]

  operation :index,
    summary: "List form templates",
    description: "Lists form templates in the authenticated coach business.",
    operation_id: "listFormTemplates",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Form templates", "application/json", ClientProfileFormTemplateListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create form template",
    description: "Creates a form template in the authenticated coach business.",
    operation_id: "createFormTemplate",
    security: [%{"bearerAuth" => []}],
    request_body: {"Form template create request", "application/json", ClientProfileFormTemplateRequest, required: true},
    responses: [
      created: {"Form template created", "application/json", ClientProfileFormTemplateResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get form template",
    description: "Loads one form template in the authenticated coach business.",
    operation_id: "getFormTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    responses: [
      ok: {"Form template", "application/json", ClientProfileFormTemplateResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update form template",
    description: "Updates a form template in the authenticated coach business.",
    operation_id: "updateFormTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    request_body: {"Form template update request", "application/json", ClientProfileFormTemplateUpdateRequest, required: true},
    responses: [
      ok: {"Form template updated", "application/json", ClientProfileFormTemplateResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete form template",
    description: "Deletes a form template in the authenticated coach business.",
    operation_id: "deleteFormTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    responses: [
      no_content: "Form template deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :assign,
    summary: "Assign form template",
    description: "Assigns a form template to a client in the authenticated coach business.",
    operation_id: "assignFormTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    request_body: {"Form assignment request", "application/json", ClientProfileFormAssignmentAssignRequest, required: true},
    responses: [
      created: {"Form assignment created", "application/json", ClientProfileFormAssignmentResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, templates} <- ClientProfiles.list_form_templates(ctx) do
      render(conn, :index, templates: templates)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- ClientProfiles.create_form_template(ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, template: template)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- ClientProfiles.get_form_template(ctx, id) do
      render(conn, :show, template: template)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- ClientProfiles.update_form_template(ctx, id, conn.body_params) do
      render(conn, :show, template: template)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, _template} <- ClientProfiles.delete_form_template(ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]
    client_id = conn.body_params[:client_id]

    with {:ok, assignment} <-
           ClientProfiles.assign_form_template_to_client(ctx, client_id, id, conn.body_params) do
      conn
      |> put_status(:created)
      |> put_view(json: EasyWeb.Coaches.FormAssignmentJSON)
      |> render(:show, assignment: assignment)
    end
  end
end
