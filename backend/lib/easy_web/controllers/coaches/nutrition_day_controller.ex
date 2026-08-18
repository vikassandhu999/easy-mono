defmodule EasyWeb.Coaches.NutritionDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Diary
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, NutritionDayListResponse}
  alias OpenApiSpex.Operation

  tags ["coach nutrition days"]

  operation :index,
    summary: "List client nutrition days",
    description: "Nutrition Day payload for a client: the same row and Meal Slot vocabulary as the client read.",
    operation_id: "listCoachNutritionDays",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:client_id, :path, :string, "Client id"),
      Operation.parameter(:date, :query, :string, "Exact local date (YYYY-MM-DD); overrides from/to", required: false),
      Operation.parameter(:from, :query, :string, "Inclusive start date; required with to", required: false),
      Operation.parameter(:to, :query, :string, "Inclusive end date; required with from; range max 31 days", required: false),
      Operation.parameter(:offset, :query, :integer, "Number of local dates to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false)
    ],
    responses: [
      ok: {"Nutrition days", "application/json", NutritionDayListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid date range", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    client_id = conn.path_params["client_id"]

    with {:ok, date} <- Easy.Utils.parse_optional_date(params["date"]),
         {:ok, from_date} <- Easy.Utils.parse_optional_date(params["from"]),
         {:ok, to_date} <- Easy.Utils.parse_optional_date(params["to"]),
         {:ok, %{nutrition_days: days, count: count}} <-
           Diary.list_nutrition_days_for_client(conn.assigns.ctx, client_id,
             date: date,
             from: from_date,
             to: to_date,
             offset: parse_integer(params, "offset", 0),
             limit: parse_integer(params, "limit", 20)
           ) do
      render(conn, :index, days: days, count: count)
    end
  end
end
