defmodule EasyWeb.Clients.TrainingPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Training.PlanReader
  alias EasyWeb.Types.{TrainingPlan, TrainingPlanCoverage, TrainingPlanIndex}

  typed(:coverage,
    query: TrainingPlan.coverage_query(),
    ok: {200, data(TrainingPlanCoverage.t() | nil)}
  )

  typed(:index, query: TrainingPlan.client_list_query(), ok: {200, TrainingPlanIndex.t()})
  typed(:show, ok: {200, data(TrainingPlan.t())})

  @spec coverage(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def coverage(conn, _params) do
    date = conn.query_params["date"]

    with {:ok, coverage} <- PlanReader.resolve_client_coverage(conn.assigns.ctx, date) do
      ok(conn, %{data: coverage})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, page} <- PlanReader.list_client_plan_page(conn.assigns.ctx, list_opts(conn.query_params)) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_client_plan(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end

  defp list_opts(query) do
    [offset: query["offset"], limit: query["limit"], cursor: query["cursor"], search: query["search"]]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end
end
