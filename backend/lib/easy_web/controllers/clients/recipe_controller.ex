defmodule EasyWeb.Clients.RecipeController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = params |> Map.get("search", "") |> String.trim()
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    base = Recipe |> Recipe.for_business(business_id) |> Recipe.search(search)

    count = Repo.aggregate(base, :count, :id)

    ordered = if search == "", do: Recipe.newest(base), else: base

    recipes =
      ordered
      |> Easy.Utils.paginate(offset, limit)
      |> Recipe.with_ingredients()
      |> Repo.all()

    render(conn, :index, recipes: recipes, count: count)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Recipe
         |> Recipe.for_business(business_id)
         |> Recipe.with_ingredients()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      recipe -> render(conn, :show, recipe: recipe)
    end
  end
end
