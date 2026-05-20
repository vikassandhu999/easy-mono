defmodule Easy.Training.SessionReads do
  alias Easy.Repo
  alias Easy.Training.PerformedSet
  alias Easy.Training.WorkoutSession

  import Ecto.Query

  @spec list_sessions(
          String.t(),
          String.t() | nil,
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), sessions: [WorkoutSession.t()]}}
  def list_sessions(business_id, client_id, state, offset, limit) do
    base =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.with_state(state)
      |> maybe_for_client(client_id)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       sessions:
         base
         |> WorkoutSession.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> WorkoutSession.with_sets()
         |> Repo.all()
     }}
  end

  @spec fetch_session_with_sets(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_session_with_sets(business_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.with_sets()
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_session_with_sets(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_client_session_with_sets(business_id, client_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> WorkoutSession.with_sets()
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_session(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_client_session(business_id, client_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec fetch_active_client_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_active_client_session(business_id, client_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> WorkoutSession.with_state(:active)
    |> WorkoutSession.with_sets()
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec fetch_performed_set(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def fetch_performed_set(business_id, set_id) do
    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  @spec fetch_performed_set_with_exercise(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def fetch_performed_set_with_exercise(business_id, set_id) do
    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> PerformedSet.with_exercise()
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_performed_set(String.t(), String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def fetch_client_performed_set(business_id, client_id, set_id) do
    session_ids =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.for_client(client_id)
      |> select([s], s.id)

    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> where([p], p.workout_session_id in subquery(session_ids))
    |> PerformedSet.with_exercise()
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: WorkoutSession.for_client(query, client_id)

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
