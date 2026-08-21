defmodule EasyWeb.Coaches.FoodController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Library
  alias OpenApiSpex.Operation
  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    FoodCategoryListResponse,
    FoodImpactResponse,
    FoodListResponse,
    FoodRequest,
    FoodResponse,
    FoodUpdateRequest,
    StaleRevisionError
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
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete food",
    description: "Deletes a coach-owned food from the authenticated business.",
    operation_id: "deleteFood",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Food id"),
      Operation.parameter(
        :expected_revision,
        :query,
        %Schema{type: :integer, minimum: 1},
        "Revision observed by the deleting client",
        required: true
      )
    ],
    responses: [
      no_content: "Food deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision or still in use", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List foods",
    description: "Lists system and business foods visible to the authenticated coach.",
    operation_id: "listFoods",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of foods to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum foods to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive food name search", required: false),
      Operation.parameter(
        :categories,
        :query,
        %Schema{type: :array, items: %Schema{type: :string}},
        "Only foods in these categories",
        required: false,
        explode: true
      )
    ],
    responses: [
      ok: {"Foods", "application/json", FoodListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :categories,
    summary: "List food categories",
    description: "The distinct categories present in the foods visible to the coach. Free-form strings, not an enum.",
    operation_id: "listFoodCategories",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Categories", "application/json", FoodCategoryListResponse},
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
    with {:ok, food} <- Library.create_food(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, food: food)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => food_id}) do
    with {:ok, food} <- Library.get_food(conn.assigns.ctx, food_id) do
      conn
      |> put_status(:ok)
      |> render(:show, food: food)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    food_id = conn.path_params["id"]
    expected_revision = conn.body_params[:expected_revision]
    attrs = Map.delete(conn.body_params, :expected_revision)

    with {:ok, updated_food} <- Library.update_food(conn.assigns.ctx, food_id, expected_revision, attrs) do
      conn
      |> put_status(:ok)
      |> render(:show, food: updated_food)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    food_id = conn.path_params["id"]
    expected_revision = parse_integer(conn.query_params, "expected_revision", 0)

    with {:ok, _deleted} <- Library.delete_food(conn.assigns.ctx, food_id, expected_revision) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    opts = [
      search: Map.get(params, "search", ""),
      categories: List.wrap(Map.get(params, "categories")),
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 20)
    ]

    with {:ok, %{count: count, foods: foods}} <-
           Library.list_foods(conn.assigns.ctx, opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, foods: foods)
    end
  end

  @spec categories(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def categories(conn, _params) do
    with {:ok, categories} <- Library.list_food_categories(conn.assigns.ctx) do
      render(conn, :categories, categories: categories)
    end
  end

  @spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def impact(conn, %{"id" => id}) do
    with {:ok, impact} <- Library.get_food_impact(conn.assigns.ctx, id) do
      render(conn, :impact, impact)
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, food} <- Library.copy_food(conn.assigns.ctx, id) do
      conn |> put_status(:created) |> render(:show, food: food)
    end
  end
end
