defmodule EasyWeb.Clients.RecipeController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Recipes
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, RecipeListResponse, RecipeResponse}

  tags ["client recipes"]

  operation :index,
    summary: "List client recipes",
    description: "Lists recipes visible to the authenticated client.",
    operation_id: "listClientRecipes",
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

  operation :show,
    summary: "Get client recipe",
    description: "Loads one recipe visible to the authenticated client.",
    operation_id: "getClientRecipe",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Recipe id")],
    responses: [
      ok: {"Recipe", "application/json", RecipeResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{recipes: recipes, count: count}} <-
           Recipes.list_recipes(business_id, search, offset, limit) do
      render(conn, :index, recipes: recipes, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Recipes.get_recipe(business_id, id) do
      render(conn, :show, recipe: recipe)
    end
  end
end
