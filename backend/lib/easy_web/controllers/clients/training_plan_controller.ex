defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Training.PlanReader
  alias EasyWeb.Types.{TrainingPlan, TrainingPlanCoverage}

  typed(:coverage,
    query: TrainingPlan.coverage_query(),
    ok: {200, data(TrainingPlanCoverage.t() | nil)}
  )

  typed(:index, query: TrainingPlan.client_list_query(), ok: {200, page(TrainingPlan.t())})
  typed(:show, ok: {200, data(TrainingPlan.t())})

  @spec coverage(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def coverage(conn, _params) do
    date = Map.get(conn.query_params, "date", Date.utc_today())

    with {:ok, coverage} <- PlanReader.resolve_client_coverage(conn.assigns.ctx, date) do
      ok(conn, %{data: coverage})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    with {:ok, %{plans: plans, count: count}} <-
           PlanReader.list_client_plans(conn.assigns.ctx,
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
