defmodule EasyWeb.Coaches.PlanItemController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.NutritionPlans, as: Plans
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    NutritionPlanItemListResponse,
    NutritionPlanItemRequest,
    NutritionPlanItemResponse,
    NutritionPlanItemUpdateRequest
  }

  tags ["coach nutrition plan items"]

  operation :create,
    summary: "Create nutrition plan item",
    description: "Schedules a meal on a nutrition plan day.",
    operation_id: "createNutritionPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:plan_id, :path, :string, "Nutrition plan id")],
    request_body: {"Nutrition plan item request", "application/json", NutritionPlanItemRequest, required: true},
    responses: [
      created: {"Nutrition plan item created", "application/json", NutritionPlanItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List nutrition plan items",
    description: "Lists scheduled meals for a nutrition plan.",
    operation_id: "listNutritionPlanItems",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:plan_id, :path, :string, "Nutrition plan id")],
    responses: [
      ok: {"Nutrition plan items", "application/json", NutritionPlanItemListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update nutrition plan item",
    description: "Updates a scheduled meal item.",
    operation_id: "updateNutritionPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan item id")],
    request_body: {"Nutrition plan item update request", "application/json", NutritionPlanItemUpdateRequest, required: true},
    responses: [
      ok: {"Nutrition plan item updated", "application/json", NutritionPlanItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete nutrition plan item",
    description: "Deletes a scheduled meal item.",
    operation_id: "deleteNutritionPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Nutrition plan item id")],
    responses: [
      no_content: "Nutrition plan item deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims

    with {:ok, plan_item} <-
           Plans.create_plan_item_for_coach_user(
             claims.business_id,
             claims.user_id,
             plan_id,
             params
           ) do
      conn
      |> put_status(:created)
      |> render(:show, plan_item: plan_item)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, updated_plan_item} <-
           Plans.update_plan_item(business_id, plan_item_id, conn.body_params) do
      render(conn, :show, plan_item: updated_plan_item)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _deleted} <- Plans.delete_plan_item(business_id, plan_item_id) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan_items} <- Plans.list_plan_items(business_id, plan_id) do
      conn
      |> put_status(:ok)
      |> render(:index, plan_items: plan_items)
    end
  end
end
