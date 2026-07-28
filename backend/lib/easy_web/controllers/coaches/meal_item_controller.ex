defmodule EasyWeb.Coaches.MealItemController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Meals
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMealItemListResponse,
    NutritionMealItemRequest,
    NutritionMealItemResponse,
    NutritionMealItemsCreateRequest
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:create, :update, :delete]

  tags ["coach meal items"]

  operation :create,
    summary: "Create meal items",
    description: "Adds one or more food/recipe items to a meal in a single transaction, in the order given.",
    operation_id: "createMealItems",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:meal_id, :path, :string, "Meal id")],
    request_body: {"Meal items request", "application/json", NutritionMealItemsCreateRequest, required: true},
    responses: [
      created: {"Meal items created", "application/json", NutritionMealItemListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
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
  def create(conn, _params) do
    meal_id = conn.path_params["meal_id"]

    with {:ok, meal_items} <- Meals.create_meal_items(conn.assigns.ctx, meal_id, conn.body_params[:items]) do
      conn
      |> put_status(:created)
      |> render(:index, meal_items: meal_items)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    meal_item_id = conn.path_params["id"]

    with {:ok, updated_meal_item} <-
           Meals.update_meal_item(conn.assigns.ctx, meal_item_id, conn.body_params) do
      render(conn, :show, meal_item: updated_meal_item)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    meal_item_id = conn.path_params["id"]

    with {:ok, _deleted} <- Meals.delete_meal_item(conn.assigns.ctx, meal_item_id) do
      send_resp(conn, :no_content, "")
    end
  end
end
