defmodule EasyWeb.Coaches.TrainingPlanItemController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.TrainingPlans, as: Plans
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    PlanItemRequest,
    TrainingPlanItemListResponse,
    TrainingPlanItemResponse
  }

  tags ["coach training plan items"]

  operation :create,
    summary: "Create training plan item",
    description: "Schedules a workout on a training plan day.",
    operation_id: "createTrainingPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Training plan id")
    ],
    request_body: {"Training plan item request", "application/json", PlanItemRequest, required: true},
    responses: [
      created: {"Training plan item created", "application/json", TrainingPlanItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :index,
    summary: "List training plan items",
    description: "Lists scheduled workout items for a training plan.",
    operation_id: "listTrainingPlanItems",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:plan_id, :path, :string, "Training plan id")
    ],
    responses: [
      ok: {"Training plan items", "application/json", TrainingPlanItemListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  operation :update,
    summary: "Update training plan item",
    description: "Updates a scheduled workout item.",
    operation_id: "updateTrainingPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan item id")
    ],
    request_body: {"Training plan item request", "application/json", PlanItemRequest, required: true},
    responses: [
      ok: {"Training plan item updated", "application/json", TrainingPlanItemResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse}
    ]

  operation :delete,
    summary: "Delete training plan item",
    description: "Deletes a scheduled workout item.",
    operation_id: "deleteTrainingPlanItem",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:id, :path, :string, "Training plan item id")
    ],
    responses: [
      no_content: "Training plan item deleted",
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
