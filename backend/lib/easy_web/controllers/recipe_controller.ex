defmodule EasyWeb.RecipeController do
  import Ecto.Query, warn: false

  alias Easy.Nutrition.Recipe
  alias Easy.Repo
  alias EasyWeb.FallbackController
  alias Easy.Utils
  use EasyWeb, :controller

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"] do
      limit = Utils.safe_int(params["limit"] || "50")
      offset = Utils.safe_int(params["offset"] || "0")
      status = params["status"]
      search_query = Utils.parse_search(params["search"])

      query =
        from r in Recipe,
          where: r.business_id == ^business_id and r.status == ^status

      query =
        if search_query do
          from r in query, where: ilike(r.name, ^"%#{search_query}%")
        else
          query
        end

      recipes =
        query
        |> offset(^offset)
        |> limit(^limit)
        |> Repo.all()

      conn
      |> put_status(:ok)
      |> render(:index, %{
        recipes: recipes,
        meta: %{
          limit: limit,
          offset: offset,
          total: length(recipes)
        }
      })
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         coach_id <- claims["coach_id"],
         attrs_with_ids =
           conn.body_params
           |> Map.put("business_id", business_id)
           |> Map.put("creator_id", coach_id),
         {:ok, recipe} <-
           %Recipe{}
           |> Recipe.changeset(attrs_with_ids)
           |> Repo.insert() do
      conn
      |> put_status(:created)
      |> render(:create, %{recipe: recipe})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:update, %{recipe: conn.assigns.recipe})
  end

  def update(conn, _params) do
    with {:ok, updated_recipe} <-
           conn.assigns.recipe |> Recipe.changeset(conn.body_params) |> Repo.update() do
      conn
      |> put_status(:ok)
      |> render(:update, %{recipe: updated_recipe})
    end
  end

  def delete(conn, _params) do
    recipe = conn.assigns.recipe

    with {:ok, _deleted_recipe} <-
           recipe |> Repo.delete() do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         %Recipe{} = recipe <-
           Repo.one(from(r in Recipe, where: r.id == ^id and r.business_id == ^business_id)) do
      assign(conn, :recipe, recipe)
    else
      _ ->
        FallbackController.not_found_response(conn, "Recipe not found.")
    end
  end
end
