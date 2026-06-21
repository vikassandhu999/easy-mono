defmodule EasyWeb.Coaches.MealController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Meals
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionMealListResponse,
    NutritionMealRequest,
    NutritionMealResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:create, :update]

  tags ["coach meals"]

  operation :create,
    summary: "Create meal",
    description: "Creates a meal in a nutrition plan.",
    operation_id: "createMeal",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:plan_id, :path, :string, "Nutrition plan id")],
    request_body: {"Meal request", "application/json", NutritionMealRequest, required: true},
    responses: [
      created: {"Meal created", "application/json", NutritionMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List meals",
    description: "Lists meals in a nutrition plan.",
    operation_id: "listMeals",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Nutrition plan id"),
      Operation.parameter(:offset, :query, :integer, "Number of meals to skip", required: false),
      Operation.parameter(:limit, :query, :integer, "Maximum meals to return", required: false)
    ],
    responses: [
      ok: {"Meals", "application/json", NutritionMealListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :show,
    summary: "Get meal",
    description: "Loads one meal with meal items.",
    operation_id: "getMeal",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Meal id")],
    responses: [
      ok: {"Meal", "application/json", NutritionMealResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

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

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    claims = conn.assigns.claims
    plan_id = conn.path_params["plan_id"]

    with {:ok, meal} <-
           Meals.create_meal_for_coach_user(claims.business_id, claims.user_id, plan_id, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, meal: meal)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, meal} <- Meals.get_meal_with_items(business_id, meal_id) do
      render(conn, :show, meal: meal)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    %{business_id: business_id} = conn.assigns.claims
    meal_id = conn.path_params["id"]

    with {:ok, updated_meal} <- Meals.update_meal(business_id, meal_id, conn.body_params) do
      render(conn, :show, meal: updated_meal)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => meal_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Meals.delete_meal(business_id, meal_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    offset = parse_integer(params, "offset", 0)
    limit = parse_integer(params, "limit", 50)

    with {:ok, %{count: count, meals: meals}} <-
           Meals.list_meals(business_id, plan_id, offset, limit) do
      conn
      |> put_status(:ok)
      |> render(:index, count: count, meals: meals)
    end
  end
end
