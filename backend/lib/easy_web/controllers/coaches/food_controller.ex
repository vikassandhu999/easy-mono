defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Foods
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    FoodImpactResponse,
    FoodListResponse,
    FoodRequest,
    FoodResponse,
    FoodUpdateRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :update, :delete, :copy]

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

  operation :impact,
    summary: "Show plans/templates affected by a food",
    operation_id: "getNutritionFoodImpact",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Impact", "application/json", FoodImpactResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :copy,
    summary: "Copy a food into the coach's business",
    operation_id: "copyNutritionFood",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      created: {"Food", "application/json", FoodResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, food} <- Foods.create_food(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    with {:ok, food} <- Foods.get_visible_food(conn.assigns.ctx, food_id) do
      conn
      |> put_status(:ok)
      |> render(:show, food: food)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    food_id = conn.path_params["id"]

    with {:ok, updated_food} <- Foods.update_food(conn.assigns.ctx, food_id, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:show, food: updated_food)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    food_id = conn.path_params["id"]

    with {:ok, _deleted} <- Foods.delete_food(conn.assigns.ctx, food_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts = [
      search: Map.get(params, "search", ""),
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 20)
    ]

    with {:ok, %{count: count, foods: foods}} <-
           Foods.list_visible_foods(conn.assigns.ctx, opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end

  @spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def impact(conn, %{"id" => id}) do
    with {:ok, impact} <- Foods.get_food_impact(conn.assigns.ctx, id) do
      render(conn, :impact, impact)
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, food} <- Foods.copy_food(conn.assigns.ctx, id) do
      conn |> put_status(:created) |> render(:show, food: food)
    end
  end
end
