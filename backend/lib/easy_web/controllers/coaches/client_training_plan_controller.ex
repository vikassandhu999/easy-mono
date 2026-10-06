defmodule EasyWeb.Coaches.ClientTrainingPlanController do
  alias Easy.Plans.Reader, as: PlanReader
  alias Easy.Training.History
  alias EasyWeb.Types.Training.ExerciseHistory
  use EasyWeb, :typed_controller

  alias EasyWeb.Types.TrainingOccurrences
  alias EasyWeb.Types.{TrainingPlan, TrainingPlanIndex}

  typed(:index,
    query: TrainingPlan.client_scoped_list_query(),
    ok: {200, TrainingPlanIndex.t()}
  )

  typed(:occurrences, query: TrainingPlan.range_query(), ok: {200, TrainingOccurrences.t()})

  typed(:exercise_history,
    path: %{exercise_id: String.t()},
    ok: {200, data(ExerciseHistory.t())}
  )

  @spec occurrences(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def occurrences(conn, _params) do
    with {:ok, rows} <-
           History.occurrences_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.query_params["from"],
             conn.query_params["to"]
           ) do
      ok(conn, rows)
    end
  end

  @spec exercise_history(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def exercise_history(conn, _params) do
    with {:ok, history} <-
           History.exercise_history_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["exercise_id"]
           ) do
      ok(conn, %{data: history})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    status = Map.get(params, "status")

    with {:ok, page} <-
           PlanReader.list_plan_page_for_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             :training,
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
