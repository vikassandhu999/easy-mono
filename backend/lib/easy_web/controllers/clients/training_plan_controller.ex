defmodule EasyWeb.Clients.TrainingPlanController do
  alias Easy.Plans.Reader, as: PlanReader
  alias Easy.Training.History
  alias EasyWeb.Types.Training.ExerciseHistory
  use EasyWeb, :typed_controller

  alias EasyWeb.Types.TrainingOccurrences
  alias EasyWeb.Types.{TrainingPlan, TrainingPlanCoverage, TrainingPlanIndex}

  typed(:coverage,
    query: TrainingPlan.coverage_query(),
    ok: {200, data(TrainingPlanCoverage.t() | nil)}
  )

  typed(:index, query: TrainingPlan.client_list_query(), ok: {200, TrainingPlanIndex.t()})
  typed(:show, ok: {200, data(TrainingPlan.t())})

  typed(:occurrences, query: TrainingPlan.range_query(), ok: {200, TrainingOccurrences.t()})

  typed(:exercise_history,
    path: %{exercise_id: String.t()},
    ok: {200, data(ExerciseHistory.t())}
  )

  @spec occurrences(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def occurrences(conn, _params) do
    with {:ok, rows} <-
           History.client_occurrences(
             conn.assigns.ctx,
             conn.query_params["from"],
             conn.query_params["to"]
           ) do
      ok(conn, rows)
    end
  end

  @spec exercise_history(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def exercise_history(conn, _params) do
    with {:ok, history} <-
           History.client_exercise_history(conn.assigns.ctx, conn.path_params["exercise_id"]) do
      ok(conn, %{data: history})
    end
  end

  @spec coverage(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def coverage(conn, _params) do
    date = conn.query_params["date"]

    with {:ok, coverage} <- PlanReader.resolve_client_coverage(conn.assigns.ctx, :training, date) do
      ok(conn, %{data: coverage})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, page} <- PlanReader.list_client_plan_page(conn.assigns.ctx, :training, list_opts(conn.query_params)) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_client_plan(conn.assigns.ctx, :training, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end

  defp list_opts(query) do
    [offset: query["offset"], limit: query["limit"], cursor: query["cursor"], search: query["search"]]
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
  end
end
