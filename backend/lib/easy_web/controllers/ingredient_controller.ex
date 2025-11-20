defmodule EasyWeb.IngredientController do
  import Ecto.Query, warn: false

  alias Easy.Nutrition
  alias Easy.Nutrition.Ingredient
  alias Easy.Repo
  alias EasyWeb.FallbackController
  use EasyWeb, :controller

  plug :authorize_resource when action in [:show, :update, :delete]

  def index(conn, params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"] do
      {ingredients, meta} = Nutrition.list_ingredients(business_id, params)

      conn
      |> put_status(:ok)
      |> render(:index, %{
        ingredients: ingredients,
        meta: meta
      })
    end
  end

  def create(conn, _params) do
    with claims <- conn.assigns.token_claims,
         business_id <- claims["business_id"],
         coach_id <- claims["coach_id"],
         {:ok, ingredient} <- Nutrition.create_ingredient(business_id, coach_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:create, %{ingredient: ingredient})
    end
  end

  def show(conn, _params) do
    conn
    |> put_status(:ok)
    |> render(:update, %{ingredient: conn.assigns.ingredient})
  end

  def update(conn, _params) do
    with {:ok, updated_ingredient} <-
           Nutrition.update_ingredient(conn.assigns.ingredient, conn.body_params) do
      conn
      |> put_status(:ok)
      |> render(:update, %{ingredient: updated_ingredient})
    end
  end

  def delete(conn, _params) do
    ingredient = conn.assigns.ingredient

    with {:ok, _deleted_ingredient} <- Nutrition.delete_ingredient(ingredient) do
      send_resp(conn, :no_content, "")
    end
  end

  defp authorize_resource(conn, _opts) do
    with %{"id" => id} <- conn.params,
         %{"business_id" => business_id} <- conn.assigns.token_claims,
         %Ingredient{} = ingredient <-
           Repo.one(
             from i in Ingredient,
               where: i.id == ^id and i.business_id == ^business_id
           ) do
      assign(conn, :ingredient, ingredient)
    else
      _ ->
        FallbackController.not_found_response(conn, "Ingredient not found.")
    end
  end
end
