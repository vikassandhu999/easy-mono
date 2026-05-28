defmodule EasyWeb.Coaches.TrainingPlanItemController do
  use EasyWeb, :controller

  alias Easy.TrainingPlans, as: Plans

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
