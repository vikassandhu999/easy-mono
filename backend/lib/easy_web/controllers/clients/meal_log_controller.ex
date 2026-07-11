defmodule EasyWeb.Clients.MealLogController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, MealLogListResponse}
  alias OpenApiSpex.Operation

  tags ["client meal logs"]

  operation :index,
    summary: "List client meal logs",
    operation_id: "listClientMealLogs",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Exact date", required: false),
      Operation.parameter(:from, :query, :string, "Start date", required: false),
      Operation.parameter(:to, :query, :string, "End date", required: false)
    ],
    responses: [ok: {"Meal logs", "application/json", MealLogListResponse}, unauthorized: {"Unauthorized", "application/json", ErrorResponse}]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    date = Easy.Utils.safe_date(params["date"])
    from_date = Easy.Utils.safe_date(params["from"])
    to_date = Easy.Utils.safe_date(params["to"])

    with {:ok, meal_logs} <-
           MealLogs.list_client_meal_logs(conn.assigns.ctx, date: date, from: from_date, to: to_date) do
      render(conn, :index, meal_logs: meal_logs)
    end
  end
end
