defmodule EasyWeb.Clients.FoodController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Foods
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, FoodListResponse, FoodResponse}

  tags ["client foods"]

  operation :index,
    summary: "List client foods",
    description: "Lists system and business foods visible to the authenticated client.",
    operation_id: "listClientFoods",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:offset, :query, :integer, "Number of foods to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum foods to return", required: false),
      Operation.parameter(:search, :query, :string, "Case-insensitive food name search", required: false)
    ],
    responses: [
      ok: {"Foods", "application/json", FoodListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get client food",
    description: "Loads one system or business food visible to the authenticated client.",
    operation_id: "getClientFood",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Food id")
    ],
    responses: [
      ok: {"Food", "application/json", FoodResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    %{business_id: business_id} = conn.assigns.claims

    search = Map.get(params, "search", "")
    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{foods: foods, count: count}} <-
           Foods.list_visible_foods(business_id, search, offset, limit) do
      render(conn, :index, foods: foods, count: count)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, food} <- Foods.get_visible_food(business_id, id) do
      render(conn, :show, food: food)
    end
  end
end
