defmodule EasyWeb.Coaches.PlanDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionDayMealCreateRequest,
    NutritionDayMealResponse,
    NutritionDayMealWithMealResponse,
    NutritionPlanDayCreateRequest,
    NutritionPlanDayResponse,
    NutritionPlanDayUpdateRequest,
    NutritionScheduleRequest,
    NutritionScheduleResponse,
    NutritionSlotOptionMoveRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [
              :create,
              :update,
              :delete,
              :update_schedule,
              :add_meal,
              :move_option,
              :remove_option
            ]

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
    description: "The last remaining day of a plan cannot be deleted. Its weekdays move to the first remaining day.",
    operation_id: "deleteNutritionPlanDay",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      no_content: "Day deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Last day", "application/json", ErrorResponse}
    ]

  operation :update_schedule,
    summary: "Replace a nutrition plan's weekday schedule",
    description: "Takes the full Mon..Sun map; every weekday must point at a day of this plan.",
    operation_id: "updateNutritionPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    request_body: {"Schedule", "application/json", NutritionScheduleRequest, required: true},
    responses: [
      ok: {"Schedule", "application/json", NutritionScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :add_meal,
    summary: "Place a meal on a plan day's slot",
    description: "Creates a new plan meal (`name`) or places an existing one (`nutrition_meal_id`) — exactly one.",
    operation_id: "addNutritionDayMeal",
    security: [%{"bearerAuth" => []}],
    parameters: [day_id: [in: :path, type: :string, required: true]],
    request_body: {"Day meal", "application/json", NutritionDayMealCreateRequest, required: true},
    responses: [
      created: {"Day meal", "application/json", NutritionDayMealWithMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Too many options", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :move_option,
    summary: "Move a meal option to another slot or position on the same day",
    operation_id: "moveNutritionSlotOption",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    request_body: {"Option", "application/json", NutritionSlotOptionMoveRequest, required: true},
    responses: [
      ok: {"Option", "application/json", NutritionDayMealResponse},
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

  @spec update_schedule(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_schedule(conn, _params) do
    %{"plan_id" => plan_id} = conn.path_params

    with {:ok, schedule} <- NutritionPlans.update_plan_schedule(conn.assigns.ctx, plan_id, conn.body_params) do
      render(conn, :schedule, schedule: schedule)
    end
  end

  @spec add_meal(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def add_meal(conn, _params) do
    %{"day_id" => day_id} = conn.path_params

    with {:ok, day_meal} <- NutritionPlans.add_day_meal(conn.assigns.ctx, day_id, conn.body_params) do
      conn |> put_status(:created) |> render(:day_meal, day_meal: day_meal)
    end
  end

  @spec move_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def move_option(conn, _params) do
    %{"id" => day_meal_id} = conn.path_params

    with {:ok, day_meal} <- NutritionPlans.move_slot_option(conn.assigns.ctx, day_meal_id, conn.body_params) do
      render(conn, :option, day_meal: day_meal)
    end
  end

  @spec remove_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remove_option(conn, _params) do
    %{"id" => day_meal_id} = conn.path_params

    with {:ok, _deleted} <- NutritionPlans.remove_slot_option(conn.assigns.ctx, day_meal_id) do
      send_resp(conn, :no_content, "")
    end
  end
end
