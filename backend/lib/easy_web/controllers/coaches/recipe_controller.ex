defmodule EasyWeb.Coaches.RecipeController do
  use EasyWeb, :controller

  alias Easy.Recipes

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, recipe} <-
           Recipes.create_recipe_for_coach_user(claims.business_id, claims.user_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, recipe: recipe)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, recipe} <- Recipes.get_recipe(business_id, recipe_id) do
      render(conn, :show, recipe: recipe)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_recipe} <- Recipes.update_recipe(business_id, recipe_id, conn.body_params) do
      render(conn, :show, recipe: updated_recipe)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Recipes.delete_recipe(business_id, recipe_id) do
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
           Recipes.list_recipes(business_id, search_term, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, recipes: recipes)
    end
  end
end
