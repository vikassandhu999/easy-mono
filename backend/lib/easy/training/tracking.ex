defmodule Easy.Training.Tracking do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Training.Tracking.{WorkoutSession, PerformedSet}

  @session_preloads [performed_sets: :exercise]

  # Workout Sessions

  def list_sessions(business_id, opts \\ []) do
    client_id = Keyword.get(opts, :client_id)
    state = Keyword.get(opts, :state)

    sessions =
      WorkoutSession
      |> where([s], s.business_id == ^business_id)
      |> apply_client_filter(client_id)
      |> apply_state_filter(state)
      |> order_by([s], desc: s.started_at)
      |> preload(^@session_preloads)
      |> Repo.all()

    {:ok, sessions}
  end

  def fetch_session(business_id, id) do
    WorkoutSession
    |> where([s], s.id == ^id and s.business_id == ^business_id)
    |> preload(^@session_preloads)
    |> Repo.one()
    |> wrap_result()
  end

  def get_session!(id), do: Repo.get!(WorkoutSession, id) |> Repo.preload(@session_preloads)

  def start_session(business_id, client_id, attrs \\ %{}) do
    attrs = Map.put(attrs, "started_at", DateTime.utc_now())

    %WorkoutSession{business_id: business_id, client_id: client_id}
    |> WorkoutSession.changeset(attrs)
    |> Repo.insert()
    |> reload_preloads(@session_preloads)
  end

  def complete_session(%WorkoutSession{} = session, attrs \\ %{}) do
    attrs =
      attrs
      |> stringify_keys()
      |> Map.merge(%{"ended_at" => DateTime.utc_now(), "state" => :completed})

    session
    |> WorkoutSession.changeset(attrs)
    |> Repo.update()
    |> reload_preloads(@session_preloads, force: true)
  end

  def discard_session(%WorkoutSession{} = session) do
    session
    |> WorkoutSession.changeset(%{state: :discarded})
    |> Repo.update()
  end

  def fetch_performed_set(business_id, id) do
    PerformedSet
    |> join(:inner, [ps], ws in WorkoutSession, on: ps.workout_session_id == ws.id)
    |> where([ps, ws], ps.id == ^id and ws.business_id == ^business_id)
    |> preload(:exercise)
    |> Repo.one()
    |> wrap_result()
  end

  def create_performed_set(business_id, attrs) do
    session_id = attrs[:workout_session_id] || attrs["workout_session_id"]

    %PerformedSet{workout_session_id: session_id, business_id: business_id}
    |> PerformedSet.changeset(attrs)
    |> Repo.insert()
    |> reload_preloads(:exercise)
  end

  def update_performed_set(%PerformedSet{} = set, attrs) do
    set
    |> PerformedSet.changeset(attrs)
    |> Repo.update()
    |> reload_preloads(:exercise, force: true)
  end

  def delete_performed_set(%PerformedSet{} = set), do: Repo.delete(set)

  # Private - Query Filters

  defp apply_client_filter(query, nil), do: query
  defp apply_client_filter(query, client_id), do: where(query, [s], s.client_id == ^client_id)

  defp apply_state_filter(query, nil), do: query
  defp apply_state_filter(query, state), do: where(query, [s], s.state == ^state)

  # Private - Result Handling

  defp wrap_result(nil), do: {:error, :not_found}
  defp wrap_result(record), do: {:ok, record}

  defp reload_preloads(result, preloads, opts \\ [])

  defp reload_preloads({:ok, record}, preloads, opts),
    do: {:ok, Repo.preload(record, preloads, opts)}

  defp reload_preloads(error, _preloads, _opts), do: error

  defp stringify_keys(map) do
    Enum.into(map, %{}, fn {k, v} -> {to_string(k), v} end)
  end
end
