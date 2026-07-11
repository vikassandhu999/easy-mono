defmodule EasyWeb.Coaches.CheckInScheduleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.ClientProfiles
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileCheckInScheduleListResponse,
    ClientProfileCheckInScheduleRequest,
    ClientProfileCheckInScheduleResponse,
    ClientProfileCheckInScheduleUpdateRequest,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update, :delete]

  tags ["coach check-in schedules"]

  operation :index,
    summary: "List client check-in schedules",
    operation_id: "listCheckInSchedulesForClient",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    responses: [
      ok: {"Schedules", "application/json", ClientProfileCheckInScheduleListResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :create,
    summary: "Create client check-in schedule",
    operation_id: "createCheckInSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    request_body: {"Schedule", "application/json", ClientProfileCheckInScheduleRequest, required: true},
    responses: [
      created: {"Schedule", "application/json", ClientProfileCheckInScheduleResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update check-in schedule",
    operation_id: "updateCheckInSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Schedule id")],
    request_body: {"Schedule", "application/json", ClientProfileCheckInScheduleUpdateRequest, required: true},
    responses: [
      ok: {"Schedule", "application/json", ClientProfileCheckInScheduleResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete unused check-in schedule",
    operation_id: "deleteCheckInSchedule",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Schedule id")],
    responses: [
      no_content: "Schedule deleted",
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Schedule has assignments", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    with {:ok, schedules} <- ClientProfiles.list_check_in_schedules_for_client(conn.assigns.ctx, client_id) do
      render(conn, :index, schedules: schedules)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, schedule} <-
           ClientProfiles.create_check_in_schedule_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      conn |> put_status(:created) |> render(:show, schedule: schedule)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, schedule} <-
           ClientProfiles.update_check_in_schedule(conn.assigns.ctx, conn.path_params["id"], conn.body_params) do
      render(conn, :show, schedule: schedule)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _schedule} <- ClientProfiles.delete_check_in_schedule(conn.assigns.ctx, conn.path_params["id"]) do
      send_resp(conn, :no_content, "")
    end
  end
end
