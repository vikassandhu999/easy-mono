defmodule EasyWeb.Coaches.TrainingScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans
  alias EasyWeb.OpenApi.Schemas.{TrainingDayScheduleRequest, TrainingScheduleDayResponse, TrainingScheduleResponse, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach training schedule"]

  operation :show,
    summary: "Get a training plan's weekly schedule",
    operation_id: "getTrainingPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Schedule", "application/json", TrainingScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Set a day's workout (desired state)",
    operation_id: "setTrainingPlanDaySchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [
      plan_id: [in: :path, type: :string, required: true],
      day: [in: :path, type: :string, required: true]
    ],
    request_body: {"Day schedule", "application/json", TrainingDayScheduleRequest, required: true},
    responses: [
      ok: {"Updated day", "application/json", TrainingScheduleDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"plan_id" => plan_id}) do
    with {:ok, schedule} <- TrainingPlans.get_schedule(conn.assigns.ctx, plan_id) do
      render(conn, :show, schedule: schedule)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{"plan_id" => plan_id, "day" => day} = conn.path_params
    attrs = Map.drop(conn.body_params, [:plan_id, :day, "plan_id", "day"])

    with {:ok, entry} <- TrainingPlans.set_day_schedule(conn.assigns.ctx, plan_id, day, attrs) do
      render(conn, :day, entry: entry)
    end
  end
end
