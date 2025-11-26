defmodule Easy.Training.Tracking do
  @moduledoc """
  The Tracking context.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Training.Tracking.{WorkoutSession, PerformedSet}

  # Workout Sessions

  def list_sessions(opts \\ []) do
    client_id = Keyword.get(opts, :client_id)

    WorkoutSession
    |> filter_by_client(client_id)
    |> order_by([s], desc: s.started_at)
    |> Repo.all()
  end

  defp filter_by_client(query, nil), do: query

  defp filter_by_client(query, client_id) do
    from s in query, where: s.client_id == ^client_id
  end

  def get_session!(id) do
    Repo.get!(WorkoutSession, id)
    |> Repo.preload([:performed_sets])
  end

  def create_session(attrs \\ %{}) do
    %WorkoutSession{}
    |> WorkoutSession.changeset(attrs)
    |> Repo.insert()
  end

  def update_session(%WorkoutSession{} = session, attrs) do
    session
    |> WorkoutSession.changeset(attrs)
    |> Repo.update()
  end

  def start_session(attrs) do
    attrs = Map.put(attrs, "started_at", DateTime.utc_now())
    create_session(attrs)
  end

  def complete_session(%WorkoutSession{} = session, attrs \\ %{}) do
    attrs = Map.put(attrs, "ended_at", DateTime.utc_now())
    attrs = Map.put(attrs, "state", :completed)
    update_session(session, attrs)
  end

  def discard_session(%WorkoutSession{} = session) do
    update_session(session, %{state: :discarded})
  end

  # Performed Sets

  def create_performed_set(attrs \\ %{}) do
    %PerformedSet{}
    |> PerformedSet.changeset(attrs)
    |> Repo.insert()
  end

  def update_performed_set(%PerformedSet{} = set, attrs) do
    set
    |> PerformedSet.changeset(attrs)
    |> Repo.update()
  end

  def delete_performed_set(%PerformedSet{} = set) do
    Repo.delete(set)
  end
end
