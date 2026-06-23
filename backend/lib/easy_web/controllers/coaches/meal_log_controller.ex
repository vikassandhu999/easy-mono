defmodule EasyWeb.Coaches.MealLogController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, MealLogListResponse}

  tags ["coach meal logs"]

  operation :index,
    summary: "List client meal logs",
    operation_id: "listCoachMealLogs",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:date, :query, :string, "Exact date", required: false),
      Operation.parameter(:from, :query, :string, "Start date", required: false),
      Operation.parameter(:to, :query, :string, "End date", required: false)
    ],
    responses: [
      ok: {"Meal logs", "application/json", MealLogListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    client_id = conn.path_params["client_id"]

    date = Easy.Utils.safe_date(params["date"])
    from_date = Easy.Utils.safe_date(params["from"])
    to_date = Easy.Utils.safe_date(params["to"])

    with {:ok, meal_logs} <-
           MealLogs.list_meal_logs_for_client(conn.assigns.ctx, client_id,
             date: date,
             from: from_date,
             to: to_date
           ) do
      render(conn, :index, meal_logs: meal_logs)
    end
  end
end
