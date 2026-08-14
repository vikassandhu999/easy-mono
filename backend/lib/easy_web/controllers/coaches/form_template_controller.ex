defmodule EasyWeb.Coaches.FormTemplateController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Forms
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormTemplateListResponse,
    ClientProfileFormTemplateRequest,
    ClientProfileFormTemplateResponse,
    ClientProfileFormTemplateUpdateRequest,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :delete, :set_default_intake, :clear_default_intake]

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

  operation :set_default_intake,
    summary: "Set default intake template",
    description: "Marks this template as the intake auto-assigned to newly invited clients.",
    operation_id: "setDefaultIntakeTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    responses: [
      ok: {"Form template updated", "application/json", ClientProfileFormTemplateResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Not an active intake template", "application/json", ErrorResponse}
    ]

  operation :clear_default_intake,
    summary: "Clear default intake template",
    description: "Unmarks this template; newly invited clients fall back to the automatic default.",
    operation_id: "clearDefaultIntakeTemplate",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form template id")],
    responses: [
      ok: {"Form template updated", "application/json", ClientProfileFormTemplateResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, templates} <- Forms.list_form_templates(ctx) do
      render(conn, :index, templates: templates)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- Forms.create_form_template(ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, template: template)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- Forms.get_form_template(ctx, id) do
      render(conn, :show, template: template)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Forms.update_form_template(ctx, id, conn.body_params) do
      render(conn, :show, template: template)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, _template} <- Forms.delete_form_template(ctx, id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec set_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def set_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Forms.set_default_intake_template(ctx, id) do
      render(conn, :show, template: template)
    end
  end

  @spec clear_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def clear_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Forms.clear_default_intake_template(ctx, id) do
      render(conn, :show, template: template)
    end
  end
end
