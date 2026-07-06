defmodule EasyWeb.Clients.FoodLogEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    FoodLogEntryListResponse,
    FoodLogEntryRequest,
    FoodLogEntryResponse,
    NutritionMealLogResponse,
    NutritionSwitchOptionRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true]
       when action in [:create, :update, :log_meal, :log_day, :switch_option]

  tags ["client food log entries"]

  operation :create,
    summary: "Create food log entry",
    operation_id: "createFoodLogEntry",
    security: [%{"bearerAuth" => []}],
    request_body: {"Food log entry request", "application/json", FoodLogEntryRequest, required: true},
    responses: [
      created: {"Food log entry created", "application/json", FoodLogEntryResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :log_meal,
    summary: "Log planned meal",
    operation_id: "logMeal",
    security: [%{"bearerAuth" => []}],
    request_body: {"Log meal request", "application/json", FoodLogEntryRequest, required: true},
    responses: [
      created: {"Food log entries", "application/json", FoodLogEntryListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :log_day,
    summary: "Log planned day",
    operation_id: "logDay",
    security: [%{"bearerAuth" => []}],
    request_body: {"Log day request", "application/json", FoodLogEntryRequest, required: true},
    responses: [
      created: {"Food log entries", "application/json", FoodLogEntryListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :switch_option,
    summary: "Switch the chosen meal option for a planned slot",
    operation_id: "switchNutritionMealOption",
    security: [%{"bearerAuth" => []}],
    request_body: {"Switch option request", "application/json", NutritionSwitchOptionRequest, required: true},
    responses: [
      ok: {"Meal log", "application/json", NutritionMealLogResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update food log entry",
    operation_id: "updateFoodLogEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Food log entry id")],
    request_body: {"Food log entry request", "application/json", FoodLogEntryRequest, required: true},
    responses: [
      ok: {"Food log entry updated", "application/json", FoodLogEntryResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete food log entry",
    operation_id: "deleteFoodLogEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Food log entry id")],
    responses: [
      no_content: "Food log entry deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, entry} <- MealLogs.create_client_food_log_entry(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, food_log_entry: entry)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    entry_id = conn.path_params["id"]

    with {:ok, updated} <-
           MealLogs.update_client_food_log_entry(conn.assigns.ctx, entry_id, conn.body_params) do
      render(conn, :show, food_log_entry: updated)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    entry_id = conn.path_params["id"]

    with {:ok, _} <- MealLogs.delete_client_food_log_entry(conn.assigns.ctx, entry_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec log_meal(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_meal(conn, _params) do
    with {:ok, entries} <- MealLogs.log_client_meal(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
    end
  end

  @spec log_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_day(conn, _params) do
    with {:ok, entries} <- MealLogs.log_client_day(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:bulk, food_log_entries: entries)
    end
  end

  @spec switch_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def switch_option(conn, _params) do
    with {:ok, meal_log} <- MealLogs.switch_client_meal_option(conn.assigns.ctx, conn.body_params) do
      render(conn, :switched, meal_log: meal_log)
    end
  end
end
