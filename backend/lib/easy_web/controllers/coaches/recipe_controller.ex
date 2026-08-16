defmodule EasyWeb.Coaches.RecipeController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Nutrition.Library
  alias OpenApiSpex.Operation
  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    RecipeImpactResponse,
    RecipeListResponse,
    RecipeRequest,
    RecipeResponse,
    RecipeUpdateRequest,
    StaleRevisionError
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :update, :delete, :copy]

  tags ["coach recipes"]

  operation :create,
    summary: "Create recipe",
    description: "Creates a recipe in the authenticated business.",
    operation_id: "createRecipe",
    security: [%{"bearerAuth" => []}],
    request_body: {"Recipe request", "application/json", RecipeRequest, required: true},
    responses: [
      created: {"Recipe created", "application/json", RecipeResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get recipe",
    description: "Loads one recipe in the authenticated business.",
    operation_id: "getRecipe",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Recipe id")],
    responses: [
      ok: {"Recipe", "application/json", RecipeResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update recipe",
    description: "Updates a recipe in the authenticated business.",
    operation_id: "updateRecipe",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Recipe id")],
    request_body: {"Recipe update request", "application/json", RecipeUpdateRequest, required: true},
    responses: [
      ok: {"Recipe updated", "application/json", RecipeResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision", "application/json", StaleRevisionError},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete recipe",
    description: "Deletes a recipe in the authenticated business.",
    operation_id: "deleteRecipe",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Recipe id"),
      Operation.parameter(
        :expected_revision,
        :query,
        %Schema{type: :integer, minimum: 1},
        "Revision observed by the deleting client",
        required: true
      )
    ],
    responses: [
      no_content: "Recipe deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      conflict: {"Stale revision or still in use", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List recipes",
    description: "Lists recipes in the authenticated business.",
    operation_id: "listRecipes",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of recipes to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum recipes to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive recipe search", required: false)
    ],
    responses: [
      ok: {"Recipes", "application/json", RecipeListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :impact,
    summary: "Show plans/templates affected by a recipe",
    operation_id: "getNutritionRecipeImpact",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      ok: {"Impact", "application/json", RecipeImpactResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :copy,
    summary: "Copy a recipe into the coach's business",
    operation_id: "copyNutritionRecipe",
    security: [%{"bearerAuth" => []}],
    parameters: [id: [in: :path, type: :string, required: true]],
    responses: [
      created: {"Recipe", "application/json", RecipeResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, recipe} <- Library.create_recipe(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, recipe: recipe)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => recipe_id}) do
    with {:ok, recipe} <- Library.get_recipe(conn.assigns.ctx, recipe_id) do
      render(conn, :show, recipe: recipe)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    recipe_id = conn.path_params["id"]
    expected_revision = conn.body_params[:expected_revision]
    attrs = Map.delete(conn.body_params, :expected_revision)

    with {:ok, updated_recipe} <- Library.update_recipe(conn.assigns.ctx, recipe_id, expected_revision, attrs) do
      render(conn, :show, recipe: updated_recipe)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    recipe_id = conn.path_params["id"]
    expected_revision = parse_integer(conn.query_params, "expected_revision", 0)

    with {:ok, _deleted} <- Library.delete_recipe(conn.assigns.ctx, recipe_id, expected_revision) do
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

    with {:ok, %{count: count, recipes: recipes}} <-
           Library.list_recipes(conn.assigns.ctx, opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, recipes: recipes)
    end
  end

  @spec impact(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def impact(conn, %{"id" => id}) do
    with {:ok, impact} <- Library.get_recipe_impact(conn.assigns.ctx, id) do
      render(conn, :impact, impact)
    end
  end

  @spec copy(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def copy(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, recipe} <- Library.copy_recipe(conn.assigns.ctx, id) do
      conn |> put_status(:created) |> render(:show, recipe: recipe)
    end
  end
end
