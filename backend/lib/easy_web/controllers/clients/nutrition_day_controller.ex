defmodule EasyWeb.Clients.NutritionDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, NutritionDayListResponse}
  alias OpenApiSpex.Operation

  tags ["client nutrition days"]

  operation :index,
    summary: "List nutrition days",
    description: "Reconciled nutrition-day payload: targets, live options, and diary rows.",
    operation_id: "listClientNutritionDays",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Exact date (YYYY-MM-DD); overrides from/to", required: false),
      Operation.parameter(:from, :query, :string, "Inclusive start date; required with to", required: false),
      Operation.parameter(:to, :query, :string, "Inclusive end date; required with from; range max 31 days", required: false)
    ],
    responses: [
      ok: {"Nutrition days", "application/json", NutritionDayListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid date range", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    with {:ok, date} <- Easy.Utils.parse_optional_date(params["date"]),
         {:ok, from_date} <- Easy.Utils.parse_optional_date(params["from"]),
         {:ok, to_date} <- Easy.Utils.parse_optional_date(params["to"]),
         {:ok, days} <-
           MealLogs.list_client_nutrition_days(conn.assigns.ctx, date: date, from: from_date, to: to_date) do
      render(conn, :index, days: days)
    end
  end
end
