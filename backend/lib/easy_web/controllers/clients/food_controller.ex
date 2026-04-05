defmodule EasyWeb.Clients.FoodController do
  use EasyWeb, :controller

  alias Easy.Nutrition.Food
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = params |> Map.get("search", "") |> String.trim()
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    base = Food |> Food.for_business_or_system(business_id) |> Food.search(search)

    count = Repo.aggregate(base, :count, :id)

    ordered = if search == "", do: Food.newest(base), else: base
    foods = ordered |> Easy.Utils.paginate(offset, limit) |> Repo.all()

    render(conn, :index, foods: foods, count: count)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case Food |> Food.for_business_or_system(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      food -> render(conn, :show, food: food)
    end
  end
end
