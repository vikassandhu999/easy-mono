defmodule EasyWeb.Coaches.RecipeController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Recipe
  alias Easy.Orgs.Coaches

  def create(conn, params) do
    claims = conn.assigns.claims

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, recipe} <- Recipe.create(claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, recipe: recipe)
    end
  end

  def show(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Recipe.get(recipe_id, business_id) do
      nil -> {:error, :not_found}
      recipe -> render(conn, :show, recipe: recipe)
    end
  end

  def update(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with recipe when not is_nil(recipe) <- Recipe.get(recipe_id, business_id),
         {:ok, updated_recipe} <- Recipe.update(recipe, conn.body_params) do
      render(conn, :show, recipe: updated_recipe)
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"id" => recipe_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with recipe when not is_nil(recipe) <- Recipe.get(recipe_id, business_id),
         {:ok, _deleted} <- Recipe.delete(recipe) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search_opts = %{
      search: Map.get(params, "search", ""),
      offset: parse_integer(params, "offset", 0),
      limit: parse_integer(params, "limit", 10)
    }

    {:ok, count, recipes} = Recipe.list(business_id, search_opts)

    conn
    |> put_status(:ok)
    |> render(:index, count: count, recipes: recipes)
  end

  defp parse_integer(params, key, default) do
    case Map.get(params, key) do
      nil -> default
      value when is_binary(value) -> String.to_integer(value)
      value when is_integer(value) -> value
    end
  end
end
