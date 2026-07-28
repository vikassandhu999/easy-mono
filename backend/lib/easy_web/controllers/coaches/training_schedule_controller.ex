defmodule EasyWeb.Coaches.TrainingScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    TrainingScheduleRequest,
    TrainingScheduleResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:update]

  tags ["coach training schedule"]

  operation :update,
    summary: "Replace a training plan's weekday schedule",
    description: "Takes the full Mon..Sun map; a null weekday is a rest day and every workout must belong to this plan.",
    operation_id: "updateTrainingPlanSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [plan_id: [in: :path, type: :string, required: true]],
    request_body: {"Schedule", "application/json", TrainingScheduleRequest, required: true},
    responses: [
      ok: {"Schedule", "application/json", TrainingScheduleResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{"plan_id" => plan_id} = conn.path_params

    with {:ok, schedule} <- TrainingPlans.update_plan_schedule(conn.assigns.ctx, plan_id, conn.body_params) do
      render(conn, :show, schedule: schedule)
    end
  end
end
