defmodule EasyWeb.Coaches.ClientNutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.PlanReader
  alias EasyWeb.Types.{NutritionPlan, NutritionPlanIndex}

  typed(:index, query: NutritionPlan.client_scoped_list_query(), ok: {200, NutritionPlanIndex.t()})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    with {:ok, page} <-
           PlanReader.list_plan_page_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             cursor: Map.get(params, "cursor", "start"),
             search: Map.get(params, "search", ""),
             archived: Map.get(params, "archived"),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, page)
    end
  end
end
