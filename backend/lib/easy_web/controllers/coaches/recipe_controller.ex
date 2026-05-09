defmodule EasyWeb.Coaches.RecipeController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.Reads
  alias Easy.Orgs.Coaches

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, recipe} <- Recipe.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, recipe: recipe)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Reads.fetch_recipe(business_id, recipe_id) do
      render(conn, :show, recipe: recipe)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Reads.fetch_recipe(business_id, recipe_id),
         {:ok, updated_recipe} <- Recipe.update(recipe, conn.body_params) do
      render(conn, :show, recipe: updated_recipe)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Reads.fetch_recipe_plain(business_id, recipe_id),
         {:ok, _deleted} <- Recipe.delete(recipe) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search_term = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 10)

    with {:ok, %{count: count, recipes: recipes}} <-
           Reads.list_recipes(business_id, search_term, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, recipes: recipes)
    end
  end
end
