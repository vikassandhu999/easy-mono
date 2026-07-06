defmodule EasyWeb.Coaches.PlanDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionDayMealResponse,
    NutritionPlanDayCreateRequest,
    NutritionPlanDayResponse,
    NutritionPlanDayUpdateRequest,
    NutritionSlotOptionCreateRequest,
    NutritionWeekdayAssignmentResponse,
    NutritionWeekdayAssignRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :assign_weekday, :add_option]

  tags ["coach nutrition plan days"]

  operation :create,
    summary: "Add a day to a nutrition plan",
    operation_id: "createNutritionPlanDay",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    request_body: {"Day", "application/json", NutritionPlanDayCreateRequest, required: true},
    responses: [
      created: {"Day", "application/json", NutritionPlanDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Rename a nutrition plan day",
    operation_id: "updateNutritionPlanDay",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    request_body: {"Day", "application/json", NutritionPlanDayUpdateRequest, required: true},
    responses: [
      ok: {"Day", "application/json", NutritionPlanDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete a nutrition plan day",
    description: "The last remaining day of a plan cannot be deleted.",
    operation_id: "deleteNutritionPlanDay",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      no_content: "Day deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Last day", "application/json", ErrorResponse}
    ]

  operation :assign_weekday,
    summary: "Assign a weekday to a nutrition plan day",
    operation_id: "assignNutritionPlanWeekday",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    request_body: {"Weekday assignment", "application/json", NutritionWeekdayAssignRequest, required: true},
    responses: [
      ok: {"Assignment", "application/json", NutritionWeekdayAssignmentResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :add_option,
    summary: "Add a meal option to a plan day's slot",
    operation_id: "addNutritionSlotOption",
    security: [%{"bearerAuth" => []}],
    parameters: [day_id: [in: :path, type: :string, required: true]],
    request_body: {"Option", "application/json", NutritionSlotOptionCreateRequest, required: true},
    responses: [
      created: {"Option", "application/json", NutritionDayMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Too many options", "application/json", ErrorResponse}
    ]

  operation :remove_option,
    summary: "Remove a meal option from a plan day's slot",
    operation_id: "removeNutritionSlotOption",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      no_content: "Option deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :make_default,
    summary: "Make a meal option the default choice for its slot",
    operation_id: "makeNutritionSlotOptionDefault",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Option", "application/json", NutritionDayMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    %{"plan_id" => plan_id} = conn.path_params

    with {:ok, day} <- NutritionPlans.create_plan_day(conn.assigns.ctx, plan_id, conn.body_params) do
      conn |> put_status(:created) |> render(:show, day: day)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{"id" => day_id} = conn.path_params

    with {:ok, day} <- NutritionPlans.update_plan_day(conn.assigns.ctx, day_id, conn.body_params) do
      render(conn, :show, day: day)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    %{"id" => day_id} = conn.path_params

    with {:ok, _deleted} <- NutritionPlans.delete_plan_day(conn.assigns.ctx, day_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec assign_weekday(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign_weekday(conn, _params) do
    %{"plan_id" => plan_id} = conn.path_params

    with {:ok, assignment} <- NutritionPlans.assign_weekday(conn.assigns.ctx, plan_id, conn.body_params) do
      render(conn, :assignment, assignment: assignment)
    end
  end

  @spec add_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def add_option(conn, _params) do
    %{"day_id" => day_id} = conn.path_params

    with {:ok, day_meal} <- NutritionPlans.add_slot_option(conn.assigns.ctx, day_id, conn.body_params) do
      conn |> put_status(:created) |> render(:option, day_meal: day_meal)
    end
  end

  @spec remove_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_option(conn, _params) do
    %{"id" => day_meal_id} = conn.path_params

    with {:ok, _deleted} <- NutritionPlans.remove_slot_option(conn.assigns.ctx, day_meal_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec make_default(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def make_default(conn, _params) do
    %{"id" => day_meal_id} = conn.path_params

    with {:ok, day_meal} <- NutritionPlans.make_default_option(conn.assigns.ctx, day_meal_id) do
      render(conn, :option, day_meal: day_meal)
    end
  end
end
