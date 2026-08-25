defmodule EasyWeb.Clients.NutritionDayController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Diary
  alias Easy.Utils
  alias OpenApiSpex.{Operation, Schema}

  alias EasyWeb.OpenApi.Schemas.{
    DiaryAddExtraRequest,
    DiaryDeleteEntryRequest,
    DiaryLogPlannedItemRequest,
    DiaryLogPlannedOptionRequest,
    DiaryReplacePlannedItemRequest,
    DiarySwitchOptionRequest,
    DiaryUpdateEntryRequest,
    ErrorResponse,
    NutritionDayListResponse,
    NutritionDayResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [
              :add_extra,
              :log_planned_item,
              :log_planned_option,
              :log_planned_day,
              :switch_option,
              :replace_planned_item,
              :update_entry,
              :delete_entry
            ]

  tags ["client nutrition days"]

  operation :index,
    summary: "List nutrition days",
    description: "Nutrition Day payload: targets, live guidance for unstarted slots, and diary rows.",
    operation_id: "listClientNutritionDays",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :query, :string, "Exact local date (YYYY-MM-DD); overrides from/to", required: false),
      Operation.parameter(:from, :query, :string, "Inclusive start date; required with to", required: false),
      Operation.parameter(:to, :query, :string, "Inclusive end date; required with from; range max 31 days", required: false),
      Operation.parameter(:offset, :query, :integer, "Number of local dates to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Page size (default 20, max 100)", required: false)
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

  operation :log_planned_item,
    summary: "Log one planned item on a Nutrition Day slot",
    operation_id: "logClientNutritionDayPlannedItem",
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
    request_body: {"Log planned item request", "application/json", DiaryLogPlannedItemRequest, required: true},
    responses: [
      created: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :log_planned_option,
    summary: "Log every remaining item in the active option for a slot",
    operation_id: "logClientNutritionDayPlannedOption",
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
    request_body: {"Log planned option request", "application/json", DiaryLogPlannedOptionRequest, required: true},
    responses: [
      created: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :log_planned_day,
    summary: "Log every scheduled active option for the day",
    operation_id: "logClientNutritionDayPlannedDay",
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
    responses: [
      created: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :switch_option,
    summary: "Switch the active frozen Meal Option for a Nutrition Day slot",
    operation_id: "switchClientNutritionDayOption",
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
    request_body: {"Switch option request", "application/json", DiarySwitchOptionRequest, required: true},
    responses: [
      ok: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      forbidden: {"Client inactive", "application/json", ErrorResponse},
      not_found: {"Nutrition Day slot or option not found", "application/json", ErrorResponse},
      conflict: {"Stale revision or idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :replace_planned_item,
    summary: "Replace a planned fulfilment with another visible Food or Recipe",
    operation_id: "replaceClientNutritionDayPlannedItem",
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
    request_body: {"Replace planned item request", "application/json", DiaryReplacePlannedItemRequest, required: true},
    responses: [
      ok: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Stale revision or idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update_entry,
    summary: "Update a Diary Entry Portion and notes",
    operation_id: "updateClientNutritionDayEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :path, %Schema{type: :string, format: :date}, "Client-local date", required: true),
      Operation.parameter(:id, :path, %Schema{type: :string, format: :uuid}, "Diary Entry id", required: true),
      Operation.parameter(
        :"Idempotency-Key",
        :header,
        %Schema{type: :string, format: :uuid},
        "UUID identifying this client intent",
        required: true
      )
    ],
    request_body: {"Update entry request", "application/json", DiaryUpdateEntryRequest, required: true},
    responses: [
      ok: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Stale revision or idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete_entry,
    summary: "Delete a Diary Entry",
    operation_id: "deleteClientNutritionDayEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:date, :path, %Schema{type: :string, format: :date}, "Client-local date", required: true),
      Operation.parameter(:id, :path, %Schema{type: :string, format: :uuid}, "Diary Entry id", required: true),
      Operation.parameter(
        :"Idempotency-Key",
        :header,
        %Schema{type: :string, format: :uuid},
        "UUID identifying this client intent",
        required: true
      )
    ],
    request_body: {"Delete entry request", "application/json", DiaryDeleteEntryRequest, required: true},
    responses: [
      ok: {"Nutrition day", "application/json", NutritionDayResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      conflict: {"Stale revision or idempotency key reused with a different payload", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    with {:ok, date} <- Utils.parse_optional_date(params["date"]),
         {:ok, from_date, to_date} <- parse_range_unless_exact(params, date),
         {:ok, %{nutrition_days: days, count: count}} <-
           Diary.list_client_nutrition_days(conn.assigns.ctx,
             date: date,
             from: from_date,
             to: to_date,
             offset: parse_integer(params, "offset", 0),
             limit: parse_integer(params, "limit", 20)
           ) do
      render(conn, :index, days: days, count: count)
    end
  end

  defp parse_range_unless_exact(_params, %Date{}), do: {:ok, nil, nil}

  defp parse_range_unless_exact(params, nil) do
    with {:ok, from_date} <- Utils.parse_optional_date(params["from"]),
         {:ok, to_date} <- Utils.parse_optional_date(params["to"]) do
      {:ok, from_date, to_date}
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

  @spec log_planned_item(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_item(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <-
           Diary.log_client_planned_item(
             conn.assigns.ctx,
             date,
             conn.body_params,
             key
           ) do
      conn
      |> put_status(:created)
      |> render(:show, day: day)
    end
  end

  @spec log_planned_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_option(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.log_client_planned_option(conn.assigns.ctx, date, conn.body_params, key) do
      conn
      |> put_status(:created)
      |> render(:show, day: day)
    end
  end

  @spec log_planned_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_day(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.log_client_planned_day(conn.assigns.ctx, date, key) do
      conn
      |> put_status(:created)
      |> render(:show, day: day)
    end
  end

  @spec switch_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def switch_option(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.switch_client_option(conn.assigns.ctx, date, conn.body_params, key) do
      render(conn, :show, day: day)
    end
  end

  @spec replace_planned_item(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replace_planned_item(conn, _params) do
    date = conn.path_params["date"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <-
           Diary.replace_client_planned_item(
             conn.assigns.ctx,
             date,
             conn.body_params,
             key
           ) do
      render(conn, :show, day: day)
    end
  end

  @spec update_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_entry(conn, _params) do
    date = conn.path_params["date"]
    id = conn.path_params["id"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.update_client_entry(conn.assigns.ctx, date, id, conn.body_params, key) do
      render(conn, :show, day: day)
    end
  end

  @spec delete_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete_entry(conn, _params) do
    date = conn.path_params["date"]
    id = conn.path_params["id"]
    key = conn |> get_req_header("idempotency-key") |> List.first()

    with {:ok, date} <- parse_date(date),
         {:ok, day} <- Diary.delete_client_entry(conn.assigns.ctx, date, id, conn.body_params, key) do
      render(conn, :show, day: day)
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
