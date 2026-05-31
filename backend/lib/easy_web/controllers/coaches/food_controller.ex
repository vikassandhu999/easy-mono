defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Foods
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, FoodListResponse, FoodRequest, FoodResponse, FoodUpdateRequest}

  tags ["coach foods"]

  operation :create,
    summary: "Create food",
    description: "Creates a coach-owned food in the authenticated business.",
    operation_id: "createFood",
    security: [%{"bearerAuth" => []}],
    request_body: {"Food create request", "application/json", FoodRequest, required: true},
    responses: [
      created: {"Food created", "application/json", FoodResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get food",
    description: "Loads one system or business food visible to the authenticated coach.",
    operation_id: "getFood",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Food id")
    ],
    responses: [
      ok: {"Food", "application/json", FoodResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update food",
    description: "Updates a coach-owned food in the authenticated business.",
    operation_id: "updateFood",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Food id")
    ],
    request_body: {"Food update request", "application/json", FoodUpdateRequest, required: true},
    responses: [
      ok: {"Food updated", "application/json", FoodResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete food",
    description: "Deletes a coach-owned food from the authenticated business.",
    operation_id: "deleteFood",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Food id")
    ],
    responses: [
      no_content: "Food deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List foods",
    description: "Lists system and business foods visible to the authenticated coach.",
    operation_id: "listFoods",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of foods to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum foods to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive food name search", required: false)
    ],
    responses: [
      ok: {"Foods", "application/json", FoodListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, food} <-
           Foods.create_food_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, food} <- Foods.get_visible_food(claims.business_id, food_id) do
      conn
      |> put_status(:ok)
      |> render(:show, food: food)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, updated_food} <- Foods.update_food(claims.business_id, food_id, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:show, food: updated_food)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => food_id}) do
    claims = conn.assigns.claims

    with {:ok, _deleted} <- Foods.delete_food(claims.business_id, food_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    claims = conn.assigns.claims

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)

    with {:ok, %{count: count, foods: foods}} <-
           Foods.list_visible_foods(claims.business_id, search_term, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end
end
