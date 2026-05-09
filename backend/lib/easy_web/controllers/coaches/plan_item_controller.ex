defmodule EasyWeb.Coaches.PlanItemController do
  use EasyWeb, :controller

  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Reads
  alias Easy.Orgs.Coaches

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"plan_id" => plan_id} = params) do
    claims = conn.assigns.claims
    meal_id = Map.get(params, "meal_id")

    with {:ok, coach} <- Coaches.get_by_user_id(claims.user_id, claims.business_id),
         {:ok, plan} <- Reads.fetch_plan(claims.business_id, plan_id),
         {:ok, :valid} <- Reads.ensure_meal_for_plan(plan.id, claims.business_id, meal_id),
         {:ok, plan_item} <- PlanItem.create(plan.id, claims.business_id, coach.id, params) do
      conn
      |> put_status(:created)
      |> render(:show, plan_item: plan_item)
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims
    meal_id = Map.get(conn.body_params, "meal_id")

    with {:ok, plan_item} <- Reads.fetch_plan_item(business_id, plan_item_id),
         {:ok, :valid} <- Reads.ensure_meal_for_plan(plan_item.plan_id, business_id, meal_id),
         {:ok, updated_plan_item} <- PlanItem.update(plan_item, conn.body_params) do
      render(conn, :show, plan_item: updated_plan_item)
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => plan_item_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan_item} <- Reads.fetch_plan_item(business_id, plan_item_id),
         {:ok, _deleted} <- PlanItem.delete(plan_item) do
      send_resp(conn, :no_content, "")
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"plan_id" => plan_id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, plan_items} <- Reads.list_plan_items(business_id, plan_id) do
      conn
      |> put_status(:ok)
      |> render(:index, plan_items: plan_items)
    end
  end
end
