defmodule EasyWeb.Coaches.ScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans

  alias EasyWeb.OpenApi.Schemas.{
    NutritionDayScheduleRequest,
    NutritionScheduleDayResponse,
    NutritionScheduleResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach nutrition schedule"]

  operation :show,
    summary: "Get a plan's weekly schedule",
    operation_id: "getNutritionPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Schedule", "application/json", NutritionScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Replace a day's schedule (desired state)",
    operation_id: "setNutritionPlanDaySchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [
      plan_id: [in: :path, type: :string, required: true],
      day: [in: :path, type: :string, required: true]
    ],
    request_body: {"Day schedule", "application/json", NutritionDayScheduleRequest, required: true},
    responses: [
      ok: {"Updated day", "application/json", NutritionScheduleDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"plan_id" => plan_id}) do
    with {:ok, schedule} <- NutritionPlans.get_schedule(conn.assigns.ctx, plan_id) do
      render(conn, :show, schedule: schedule)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{"plan_id" => plan_id, "day" => day} = conn.path_params
    slots = Map.drop(conn.body_params, [:plan_id, :day, "plan_id", "day"])

    with {:ok, entries} <- NutritionPlans.set_day_schedule(conn.assigns.ctx, plan_id, day, slots) do
      render(conn, :day, entries: entries)
    end
  end
end
