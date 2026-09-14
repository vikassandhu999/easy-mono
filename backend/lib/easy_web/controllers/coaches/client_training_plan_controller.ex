defmodule EasyWeb.Coaches.ClientTrainingPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Training.PlanReader
  alias EasyWeb.Types.{TrainingPlan, TrainingPlanIndex}

  typed(:index,
    query: TrainingPlan.client_scoped_list_query(),
    ok: {200, TrainingPlanIndex.t()}
  )

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    status = Map.get(params, "status")

    with {:ok, page} <-
           PlanReader.list_plan_page_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             cursor: Map.get(params, "cursor"),
             search: Map.get(params, "search", ""),
             archived: if(status, do: status == :archived, else: nil),
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, page)
    end
  end
end
