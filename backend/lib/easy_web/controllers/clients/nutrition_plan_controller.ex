defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.PlanReader
  alias EasyWeb.Types.NutritionPlan

  typed(:index,
    query: NutritionPlan.client_list_query(),
    ok: {200, page(NutritionPlan.t())}
  )

  typed(:show, ok: {200, data(NutritionPlan.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    archived = Map.get(params, "archived")

    with {:ok, %{plans: plans, count: count}} <-
           PlanReader.list_client_plans(conn.assigns.ctx,
             archived: archived,
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, %{data: plans, count: count})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_client_plan(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end
end
