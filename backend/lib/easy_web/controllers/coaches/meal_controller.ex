defmodule EasyWeb.Coaches.MealController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Meals
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMealRequest,
    NutritionMealResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate,
       [json_render_error_v2: true] when action in [:update, :delete]

  tags ["coach meals"]

  operation :update,
    summary: "Update meal",
    description: "Updates a meal.",
    operation_id: "updateMeal",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal id")],
    request_body: {"Meal request", "application/json", NutritionMealRequest, required: true},
    responses: [
      ok: {"Meal updated", "application/json", NutritionMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete meal",
    description: "Deletes a meal.",
    operation_id: "deleteMeal",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal id")],
    responses: [
      no_content: "Meal deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    meal_id = conn.path_params["id"]

    with {:ok, updated_meal} <- Meals.update_meal(conn.assigns.ctx, meal_id, conn.body_params) do
      render(conn, :show, meal: updated_meal)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    meal_id = conn.path_params["id"]

    with {:ok, _deleted} <- Meals.delete_meal(conn.assigns.ctx, meal_id) do
      send_resp(conn, :no_content, "")
    end
  end
end
