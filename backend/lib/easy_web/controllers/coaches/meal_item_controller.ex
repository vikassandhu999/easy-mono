defmodule EasyWeb.Coaches.MealItemController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Meals
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMealItemListResponse,
    NutritionMealItemRequest,
    NutritionMealItemResponse
  }

  tags ["coach meal items"]

  operation :create,
    summary: "Create meal item",
    description: "Adds a food or recipe item to a meal.",
    operation_id: "createMealItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:meal_id, :path, :string, "Meal id")],
    request_body: {"Meal item request", "application/json", NutritionMealItemRequest, required: true},
    responses: [
      created: {"Meal item created", "application/json", NutritionMealItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List meal items",
    description: "Lists food and recipe items in a meal.",
    operation_id: "listMealItems",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:meal_id, :path, :string, "Meal id")],
    responses: [
      ok: {"Meal items", "application/json", NutritionMealItemListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update meal item",
    description: "Updates a meal item amount, unit, weight, or position.",
    operation_id: "updateMealItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal item id")],
    request_body: {"Meal item request", "application/json", NutritionMealItemRequest, required: true},
    responses: [
      ok: {"Meal item updated", "application/json", NutritionMealItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete meal item",
    description: "Deletes a meal item.",
    operation_id: "deleteMealItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal item id")],
    responses: [
      no_content: "Meal item deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"meal_id" => meal_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal_item} <- Meals.create_meal_item(business_id, meal_id, params) do
      conn
      |> put_status(:created)
      |> render(:show, meal_item: meal_item)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_meal_item} <-
           Meals.update_meal_item(business_id, meal_item_id, conn.body_params) do
      render(conn, :show, meal_item: updated_meal_item)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => meal_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Meals.delete_meal_item(business_id, meal_item_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"meal_id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal_items} <- Meals.list_meal_items(business_id, meal_id) do
      conn
      |> put_status(:ok)
      |> render(:index, meal_items: meal_items)
    end
  end
end
