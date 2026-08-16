defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Programming

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionPlanCreateRequest,
    NutritionPlanListResponse,
    NutritionPlanResponse,
    NutritionPlanRevisionRequest,
    NutritionPlanUpdateRequest,
    StaleRevisionError
  }

  alias OpenApiSpex.{Operation, Schema}

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :delete, :archive, :restore, :duplicate]

  tags ["coach nutrition plans"]

  operation :index,
    summary: "List Nutrition Templates",
    description: "Lists reusable Nutrition Templates from the authenticated business.",
    operation_id: "listNutritionPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of nutrition plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive nutrition plan name search", required: false),
      Operation.parameter(
        :archived,
        :query,
        %Schema{type: :boolean},
        "Filter by whether the Nutrition Template is archived",
        required: false
      )
    ],
    responses: [
      ok: {"Nutrition Templates", "application/json", NutritionPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create a Nutrition Template",
    description: "Creates a reusable Nutrition Template with one empty Everyday Day Pattern assigned to every weekday.",
    operation_id: "createNutritionPlan",
    security: [%{"bearerAuth" => []}],
    request_body: {"Nutrition Template create request", "application/json", NutritionPlanCreateRequest, required: true},
    responses: [
      created: {"Nutrition Template created", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get a Nutrition Template or visible Client Plan",
    description: "Loads one Nutrition Template or authorized Client Nutrition Plan.",
    operation_id: "getNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    responses: [
      ok: {"Nutrition Template or Client Plan", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update a Nutrition Template or visible Client Plan",
    description: "Updates revisioned metadata and nutrient targets. Relationship ids and tenant ownership are never accepted.",
    operation_id: "updateNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    request_body: {"Nutrition Template or Client Plan update request", "application/json", NutritionPlanUpdateRequest, required: true},
    responses: [
      ok: {"Nutrition Template or Client Plan updated", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete a Nutrition Template or visible Client Plan",
    description: "Deletes one revisioned Nutrition Template or authorized Client Nutrition Plan.",
    operation_id: "deleteNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Nutrition plan id"),
      Operation.parameter(
        :expected_revision,
        :query,
        %Schema{type: :integer, minimum: 1},
        "Revision observed by the deleting client",
        required: true
      )
    ],
    responses: [
      no_content: "Nutrition Template or Client Plan deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError}
    ]

  operation :archive,
    summary: "Archive a Nutrition Template or visible Client Plan",
    description: "Archives a revisioned Nutrition Template or authorized Client Nutrition Plan without deleting it.",
    operation_id: "archiveNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition Template or Client Plan id")],
    request_body: {"Expected revision", "application/json", NutritionPlanRevisionRequest, required: true},
    responses: [
      ok: {"Nutrition Template or Client Plan archived", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :restore,
    summary: "Restore a Nutrition Template or visible Client Plan",
    description: "Restores a revisioned Nutrition Template or authorized Client Nutrition Plan.",
    operation_id: "restoreNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition Template or Client Plan id")],
    request_body: {"Expected revision", "application/json", NutritionPlanRevisionRequest, required: true},
    responses: [
      ok: {"Nutrition Template or Client Plan restored", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :duplicate,
    summary: "Duplicate a Nutrition Template",
    description: "Copies an active Nutrition Template, including its empty Day Pattern and Week Schedule, using the expected source revision.",
    operation_id: "duplicateNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition Template id")],
    request_body: {"Expected source revision", "application/json", NutritionPlanRevisionRequest, required: true},
    responses: [
      created: {"Nutrition Template duplicated", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, plan} <- Programming.create_template(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- Programming.get_plan(conn.assigns.ctx, conn.path_params["id"]) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    expected_revision = conn.body_params[:expected_revision]
    attrs = Map.delete(conn.body_params, :expected_revision)

    with {:ok, updated} <-
           Programming.update_plan(conn.assigns.ctx, conn.path_params["id"], expected_revision, attrs) do
      render(conn, :show, plan: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    expected_revision = parse_integer(conn.query_params, "expected_revision", 0)

    with {:ok, _plan} <-
           Programming.delete_plan(conn.assigns.ctx, conn.path_params["id"], expected_revision) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec archive(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive(conn, _params) do
    with {:ok, plan} <-
           Programming.archive_plan(conn.assigns.ctx, conn.path_params["id"], conn.body_params[:expected_revision]) do
      render(conn, :show, plan: plan)
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, plan} <-
           Programming.restore_plan(conn.assigns.ctx, conn.path_params["id"], conn.body_params[:expected_revision]) do
      render(conn, :show, plan: plan)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 20)
    search = Map.get(params, "search", "")
    archived = parse_optional_boolean(Map.get(params, "archived"))

    with {:ok, %{templates: plans, count: count}} <-
           Programming.list_templates(conn.assigns.ctx,
             search: search,
             archived: archived,
             offset: offset,
             limit: limit
           ) do
      render(conn, :index, plans: plans, count: count)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, _params) do
    with {:ok, duplicated} <-
           Programming.duplicate_template(
             conn.assigns.ctx,
             conn.path_params["id"],
             conn.body_params[:expected_revision]
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: duplicated)
    end
  end

  defp parse_optional_boolean(true), do: true
  defp parse_optional_boolean("true"), do: true
  defp parse_optional_boolean(false), do: false
  defp parse_optional_boolean("false"), do: false
  defp parse_optional_boolean(_value), do: nil
end
