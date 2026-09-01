defmodule EasyWeb.Coaches.ClientNutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Programming
  alias EasyWeb.Types.NutritionPlan

  typed(:index,
    query: NutritionPlan.client_list_query(),
    ok: {200, page(NutritionPlan.t())}
  )

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    archived = if params["status"], do: params["status"] == :archived, else: nil

    with {:ok, %{plans: plans, count: count}} <-
           Programming.list_plans_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             archived: archived,
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, %{data: plans, count: count})
    end
  end
end
