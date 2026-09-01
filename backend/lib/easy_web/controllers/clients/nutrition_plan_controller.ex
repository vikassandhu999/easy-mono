defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Programming
  alias EasyWeb.Types.NutritionPlan

  typed(:index,
    query: NutritionPlan.client_list_query(),
    ok: {200, page(NutritionPlan.t())}
  )

  typed(:show, ok: {200, data(NutritionPlan.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    archived = if params["status"], do: params["status"] == :archived, else: nil

    with {:ok, %{plans: plans, count: count}} <-
           Programming.list_client_plans(conn.assigns.ctx,
             archived: archived,
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, %{data: plans, count: count})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- Programming.get_client_plan(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end
end
