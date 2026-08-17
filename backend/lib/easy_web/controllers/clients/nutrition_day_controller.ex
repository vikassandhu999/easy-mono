defmodule EasyWeb.Clients.NutritionDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Diary
  alias Easy.Utils
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    DiaryAddExtraRequest,
    ErrorResponse,
    NutritionDayListResponse,
    NutritionDayResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:add_extra]

  tags ["client nutrition days"]

  operation :index,
    summary: "List nutrition days",
    description: "Nutrition Day payload: targets, live guidance for unstarted slots, and diary rows.",
    operation_id: "listClientNutritionDays",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Exact local date (YYYY-MM-DD); overrides from/to", required: false),
      Operation.parameter(:from, :query, :string, "Inclusive start date; required with to", required: false),
      Operation.parameter(:to, :query, :string, "Inclusive end date; required with from; range max 31 days", required: false)
    ],
    responses: [
      ok: {"Nutrition days", "application/json", NutritionDayListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Invalid date range", "application/json", ErrorResponse}
    ]

  operation :add_extra,
    summary: "Record an extra Food or Recipe on a Nutrition Day slot",
    operation_id: "addClientNutritionDayExtra",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :path, %Schema{type: :string, format: :date}, "Client-local date", required: true),
      Operation.parameter(
        :"Idempotency-Key",
        :header,
        %Schema{type: :string, format: :uuid},
        "UUID identifying this client intent",
        required: true
      )
    ],
    request_body: {"Add extra request", "application/json", DiaryAddExtraRequest, required: true},
    responses: [
      created: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    with {:ok, date} <- Utils.parse_optional_date(params["date"]),
         {:ok, from_date} <- Utils.parse_optional_date(params["from"]),
         {:ok, to_date} <- Utils.parse_optional_date(params["to"]),
         {:ok, days} <-
           Diary.list_client_nutrition_days(conn.assigns.ctx, date: date, from: from_date, to: to_date) do
      render(conn, :index, days: days)
    end
  end

  @spec add_extra(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def add_extra(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.add_client_extra(conn.assigns.ctx, date, conn.body_params, key) do
      conn
      |> put_status(:created)
      |> render(:show, day: day)
    end
  end

  defp parse_date(%Date{} = date), do: {:ok, date}

  defp parse_date(date) when is_binary(date) do
    case Date.from_iso8601(date) do
      {:ok, parsed} -> {:ok, parsed}
      _invalid -> {:error, :invalid_date}
    end
  end

  defp parse_date(_date), do: {:error, :invalid_date}
end
