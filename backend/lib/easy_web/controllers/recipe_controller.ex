defmodule EasyWeb.RecipeController do
  import Ecto.Query, warn: false

  alias Easy.Nutrition
  alias EasyWeb.FallbackController
  use EasyWeb, :controller

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         {:ok, {recipes, meta}} <- Nutrition.list_recipes(business_id, params) do
      conn
      |> put_status(:ok)
      |> render(:index, %{
        recipes: recipes,
        meta: meta
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
           Nutrition.create_recipe(attrs_with_ids) do
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
    with {:ok, updated_recipe} <- Nutrition.update_recipe(conn.assigns.recipe, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:update, %{recipe: updated_recipe})
    end
  end

  def delete(conn, _params) do
    with {:ok, _deleted_recipe} <- Nutrition.delete_recipe(conn.assigns.recipe) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         {:ok, recipe} <- Nutrition.fetch_recipe(business_id, id) do
      assign(conn, :recipe, recipe)
    else
      _ ->
        FallbackController.not_found_response(conn, "Recipe not found.")
    end
  end
end
