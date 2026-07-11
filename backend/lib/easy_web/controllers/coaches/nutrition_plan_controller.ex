defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Plan
  alias Easy.NutritionPlans, as: Plans
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionPlanAssignRequest,
    NutritionPlanListResponse,
    NutritionPlanRequest,
    NutritionPlanResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :delete, :assign, :duplicate]

  tags ["coach nutrition plans"]

  operation :create,
    summary: "Create nutrition plan",
    description: "Creates a nutrition plan template in the authenticated business.",
    operation_id: "createNutritionPlan",
    security: [%{"bearerAuth" => []}],
    request_body: {"Nutrition plan request", "application/json", NutritionPlanRequest, required: true},
    responses: [
      created: {"Nutrition plan created", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get nutrition plan",
    description: "Loads one nutrition plan with meals and scheduled plan items.",
    operation_id: "getNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    responses: [
      ok: {"Nutrition plan", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update nutrition plan",
    description: "Updates a nutrition plan.",
    operation_id: "updateNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    request_body: {"Nutrition plan request", "application/json", NutritionPlanRequest, required: true},
    responses: [
      ok: {"Nutrition plan updated", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete nutrition plan",
    description: "Deletes a nutrition plan.",
    operation_id: "deleteNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    responses: [
      no_content: "Nutrition plan deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List nutrition plans",
    description: "Lists nutrition plan templates in the authenticated business.",
    operation_id: "listNutritionPlans",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of nutrition plans to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum nutrition plans to return", required: false),
      Operation.parameter(
        :status,
        :query,
        %Schema{type: :string, enum: ["active", "archived"]},
        "Only nutrition plans with this status",
        required: false
      )
    ],
    responses: [
      ok: {"Nutrition plans", "application/json", NutritionPlanListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :assign,
    summary: "Assign nutrition plan",
    description: "Copies a nutrition plan template to a client.",
    operation_id: "assignNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    request_body: {"Nutrition plan assign request", "application/json", NutritionPlanAssignRequest, required: true},
    responses: [
      created: {"Nutrition plan assigned", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :duplicate,
    summary: "Duplicate nutrition plan",
    description: "Copies a nutrition plan template.",
    operation_id: "duplicateNutritionPlan",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan id")],
    responses: [
      created: {"Nutrition plan duplicated", "application/json", NutritionPlanResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, plan} <- Plans.create_plan(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    plan_id = conn.path_params["id"]

    with {:ok, updated_plan} <- Plans.update_plan(conn.assigns.ctx, plan_id, conn.body_params) do
      render(conn, :show, plan: updated_plan)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params) do
    plan_id = conn.path_params["id"]
    client_id = conn.body_params[:client_id]

    with {:ok, new_plan} <-
           Plans.assign_plan_to_client(conn.assigns.ctx, client_id, plan_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => plan_id}) do
    with {:ok, plan} <- Plans.get_plan_full(conn.assigns.ctx, plan_id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    plan_id = conn.path_params["id"]

    with {:ok, _deleted} <- Plans.delete_plan(conn.assigns.ctx, plan_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{count: count, plans: plans}} <-
           Plans.list_template_plans(conn.assigns.ctx, status: status, offset: offset, limit: limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, plans: plans)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, _params) do
    plan_id = conn.path_params["id"]

    with {:ok, new_plan} <- Plans.duplicate_plan(conn.assigns.ctx, plan_id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end
end
