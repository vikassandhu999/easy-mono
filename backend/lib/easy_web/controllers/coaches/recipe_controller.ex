defmodule EasyWeb.Coaches.RecipeController do
  alias Easy.Orgs.Coaches
  use EasyWeb, :controller

  alias Easy.Nutrition.Library.Recipe
  alias Easy.Nutrition.Recipes
  alias EasyWeb.FallbackController

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, recipe} <- Recipes.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, recipe: recipe)
    end
  end

  def show(conn, %{"id" => recipe_id}) do
    claims = conn.assigns.claims

    case Recipes.get_by_id(recipe_id, claims.business_id) do
      %Recipe{} = recipe ->
        conn
        |> put_status(:ok)
        |> render(:show, recipe: recipe)

      _ ->
        FallbackController.not_found_response(conn, "Recipe not found.")
    end
  end

  def update(conn, %{"id" => recipe_id}) do
    claims = conn.assigns.claims

    case Recipes.get_by_id(recipe_id, claims.business_id) do
      %Recipe{} = recipe ->
        with {:ok, updated_recipe} <- Recipes.update(recipe, conn.body_params) do
          conn
          |> put_status(:ok)
          |> render(:show, recipe: updated_recipe)
        end

      _ ->
        FallbackController.not_found_response(conn, "Recipe not found.")
    end
  end

  def index(conn, params) do
    claims = conn.assigns.claims

    search_opts = %{
      search: Map.get(params, "search", ""),
      offset: String.to_integer(Map.get(params, "offset", "0")),
      limit: String.to_integer(Map.get(params, "limit", "10"))
    }

    with {:ok, count, recipes} <- Recipes.list_for_business(claims, search_opts) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, recipes: recipes)
    end
  end
end
