defmodule EasyWeb.Clients.MealLogController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, MealLogListResponse, MealLogResponse}

  tags ["client meal logs"]

  operation :index,
    summary: "List client meal logs",
    operation_id: "listClientMealLogs",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:date, :query, :string, "Exact date", required: false)],
    responses: [ok: {"Meal logs", "application/json", MealLogListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  operation :show,
    summary: "Get client meal log",
    operation_id: "getClientMealLog",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal log id")],
    responses: [
      ok: {"Meal log", "application/json", MealLogResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    date = Easy.Utils.safe_date(params["date"])

    with {:ok, meal_logs} <-
           MealLogs.list_meal_logs_for_user(business_id, user_id, date, nil, nil) do
      render(conn, :index, meal_logs: meal_logs)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{user_id: user_id, business_id: business_id} = conn.assigns.claims

    with {:ok, meal_log} <- MealLogs.get_client_meal_log_for_user(business_id, user_id, id) do
      render(conn, :show, meal_log: meal_log)
    end
  end
end
