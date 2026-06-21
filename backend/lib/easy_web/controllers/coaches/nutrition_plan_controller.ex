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
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, plan} <-
           Plans.create_plan_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan: plan)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan} <- Plans.get_plan_full(business_id, plan_id) do
      render(conn, :show, plan: plan)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_plan} <- Plans.update_plan(business_id, plan_id, conn.body_params) do
      render(conn, :show, plan: updated_plan)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Plans.delete_plan(business_id, plan_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)
    status = parse_enum(params, "status", Plan.statuses())

    with {:ok, %{count: count, plans: plans}} <-
           Plans.list_template_plans(business_id, status, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, plans: plans)
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, %{"id" => plan_id, "client_id" => client_id} = params) do
    claims = conn.assigns.claims

    with {:ok, new_plan} <-
           Plans.assign_to_client_for_coach_user(
             claims.business_id,
             claims.user_id,
             plan_id,
             client_id,
             params
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, %{"id" => plan_id}) do
    claims = conn.assigns.claims

    with {:ok, new_plan} <-
           Plans.duplicate_for_coach_user(claims.business_id, claims.user_id, plan_id) do
      conn
      |> put_status(:created)
      |> render(:show, plan: new_plan)
    end
  end
end
