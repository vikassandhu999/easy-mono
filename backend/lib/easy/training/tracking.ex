defmodule Easy.Training.Tracking do
  @moduledoc """
  The Tracking context.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Training.Tracking.{WorkoutSession, PerformedSet}

  @default_preloads [performed_sets: :exercise]

  # Workout Sessions

  @doc """
  Returns the list of workout sessions for a business with optional filtering.

  ## Options
    * `:client_id` - Filter by client ID
    * `:state` - Filter by session state (:active, :completed, :discarded)

  ## Examples

      iex> list_sessions(business_id, client_id: "uuid")
      {:ok, [%WorkoutSession{}, ...]}

  """
  @spec list_sessions(String.t(), keyword()) :: {:ok, list(WorkoutSession.t())}
  def list_sessions(business_id, opts \\ []) do
    client_id = Keyword.get(opts, :client_id)
    state = Keyword.get(opts, :state)

    sessions =
      WorkoutSession
      |> where([s], s.business_id == ^business_id)
      |> filter_by_client(client_id)
      |> filter_by_state(state)
      |> order_by([s], desc: s.started_at)
      |> Repo.all()
      |> Repo.preload(@default_preloads)

    {:ok, sessions}
  end

  defp filter_by_client(query, nil), do: query

  defp filter_by_client(query, client_id) do
    from s in query, where: s.client_id == ^client_id
  end

  defp filter_by_state(query, nil), do: query

  defp filter_by_state(query, state) do
    from s in query, where: s.state == ^state
  end

  @doc """
  Fetches a single workout session by ID and business_id for authorization.

  ## Examples

      iex> fetch_session(business_id, session_id)
      {:ok, %WorkoutSession{}}

      iex> fetch_session(business_id, invalid_id)
      {:error, :not_found}

  """
  @spec fetch_session(String.t(), String.t()) :: {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_session(business_id, session_id) do
    case Repo.one(
           from s in WorkoutSession,
             where: s.id == ^session_id and s.business_id == ^business_id,
             preload: ^@default_preloads
         ) do
      nil -> {:error, :not_found}
      session -> {:ok, session}
    end
  end

  @doc """
  Gets a single workout session by ID.
  Raises `Ecto.NoResultsError` if not found.

  Note: Prefer `fetch_session/2` for authorized access.
  """
  def get_session!(id) do
    Repo.get!(WorkoutSession, id)
    |> Repo.preload(@default_preloads)
  end

  @doc """
  Creates a new workout session.

  The `business_id` and `client_id` must be set in the session struct before calling.

  ## Examples

      iex> create_session(%WorkoutSession{business_id: bid, client_id: cid}, %{state: :active})
      {:ok, %WorkoutSession{}}

  """
  @spec create_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def create_session(%WorkoutSession{} = session, attrs) do
    session
    |> WorkoutSession.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, session} -> {:ok, Repo.preload(session, @default_preloads)}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Updates an existing workout session.

  ## Examples

      iex> update_session(session, %{notes: "Great workout!"})
      {:ok, %WorkoutSession{}}

  """
  @spec update_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def update_session(%WorkoutSession{} = session, attrs) do
    session
    |> WorkoutSession.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, session} -> {:ok, Repo.preload(session, @default_preloads, force: true)}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Starts a new workout session for a client.

  ## Examples

      iex> start_session(business_id, client_id, %{planned_workout_id: workout_id})
      {:ok, %WorkoutSession{}}

  """
  @spec start_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def start_session(business_id, client_id, attrs \\ %{}) do
    attrs = Map.put(attrs, "started_at", DateTime.utc_now())

    %WorkoutSession{business_id: business_id, client_id: client_id}
    |> create_session(attrs)
  end

  @doc """
  Completes a workout session.

  ## Examples

      iex> complete_session(session, %{soreness_rating: 3})
      {:ok, %WorkoutSession{state: :completed}}

  """
  @spec complete_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def complete_session(%WorkoutSession{} = session, attrs \\ %{}) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {k, v} -> {to_string(k), v} end)
      |> Map.put("ended_at", DateTime.utc_now())
      |> Map.put("state", :completed)

    update_session(session, attrs)
  end

  @doc """
  Discards a workout session.

  ## Examples

      iex> discard_session(session)
      {:ok, %WorkoutSession{state: :discarded}}

  """
  @spec discard_session(WorkoutSession.t()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def discard_session(%WorkoutSession{} = session) do
    update_session(session, %{state: :discarded})
  end

  # Performed Sets

  @doc """
  Creates a performed set for a workout session.
  The business_id must be provided for tenant isolation.

  ## Examples

      iex> create_performed_set(business_id, %{workout_session_id: sid, exercise_id: eid, actual_reps: "10", load_value: 50, load_unit: :kg})
      {:ok, %PerformedSet{}}

  """
  @spec create_performed_set(String.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, Ecto.Changeset.t()}
  def create_performed_set(business_id, attrs) do
    session_id = attrs[:workout_session_id] || attrs["workout_session_id"]

    %PerformedSet{
      workout_session_id: session_id,
      business_id: business_id
    }
    |> PerformedSet.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, set} -> {:ok, Repo.preload(set, :exercise)}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Updates a performed set.

  ## Examples

      iex> update_performed_set(set, %{reps: 12})
      {:ok, %PerformedSet{}}

  """
  @spec update_performed_set(PerformedSet.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, Ecto.Changeset.t()}
  def update_performed_set(%PerformedSet{} = set, attrs) do
    set
    |> PerformedSet.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, set} -> {:ok, Repo.preload(set, :exercise, force: true)}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Deletes a performed set.

  ## Examples

      iex> delete_performed_set(set)
      {:ok, %PerformedSet{}}

  """
  @spec delete_performed_set(PerformedSet.t()) ::
          {:ok, PerformedSet.t()} | {:error, Ecto.Changeset.t()}
  def delete_performed_set(%PerformedSet{} = set) do
    Repo.delete(set)
  end

  @doc """
  Fetches a performed set by ID with business authorization through session.

  ## Examples

      iex> fetch_performed_set(business_id, set_id)
      {:ok, %PerformedSet{}}

      iex> fetch_performed_set(business_id, invalid_id)
      {:error, :not_found}

  """
  @spec fetch_performed_set(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def fetch_performed_set(business_id, set_id) do
    query =
      from ps in PerformedSet,
        join: ws in WorkoutSession,
        on: ps.workout_session_id == ws.id,
        where: ps.id == ^set_id and ws.business_id == ^business_id,
        preload: [:exercise]

    case Repo.one(query) do
      nil -> {:error, :not_found}
      set -> {:ok, set}
    end
  end
end
