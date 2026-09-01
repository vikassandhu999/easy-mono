defmodule EasyWeb.Coaches.ClientTrainingPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Training.Programming
  alias EasyWeb.Types.TrainingPlan

  typed(:index,
    query: TrainingPlan.client_scoped_list_query(),
    ok: {200, page(TrainingPlan.t())}
  )

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    status = Map.get(params, "status")

    with {:ok, %{plans: plans, count: count}} <-
           Programming.list_plans_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             archived: if(status, do: status == :archived, else: nil),
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, %{data: plans, count: count})
    end
  end
end
