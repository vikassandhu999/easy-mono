defmodule EasyWeb.Coaches.MealItemController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Meals
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMealItemRequest,
    NutritionMealItemResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

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
    %{business_id: business_id} = conn.assigns.claims
    meal_id = conn.path_params["meal_id"]

    with {:ok, meal_item} <- Meals.create_meal_item(business_id, meal_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, meal_item: meal_item)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{business_id: business_id} = conn.assigns.claims
    meal_item_id = conn.path_params["id"]

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

end
