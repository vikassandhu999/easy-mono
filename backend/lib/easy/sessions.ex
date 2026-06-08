defmodule Easy.Sessions do
  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Training.Exercise
  alias Easy.Training.PerformedSet
  alias Easy.Training.TrainingPlan
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutElement
  alias Easy.Training.WorkoutSession

  import Ecto.Changeset
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
      |> maybe_for_client(client_id)
      |> WorkoutSession.with_state(state)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       sessions:
         base
         |> WorkoutSession.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> WorkoutSession.with_sets(business_id)
         |> Repo.all()
     }}
  end

  @spec get_session(String.t(), String.t()) :: {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_session(business_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec get_session_with_sets(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_session_with_sets(business_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.with_sets(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec get_client_session(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_client_session(business_id, client_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec get_client_session_with_sets_for_user(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_client_session_with_sets_for_user(business_id, user_id, session_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      get_client_session_with_sets(business_id, client.id, session_id)
    end
  end

  @spec get_active_client_session_for_user(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_active_client_session_for_user(business_id, user_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      get_active_client_session(business_id, client.id)
    end
  end

  @spec get_client_session_with_sets(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_client_session_with_sets(business_id, client_id, session_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> WorkoutSession.with_sets(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  @spec get_active_client_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def get_active_client_session(business_id, client_id) do
    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> WorkoutSession.with_state(:active)
    |> WorkoutSession.with_sets(business_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  @spec get_performed_set(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def get_performed_set(business_id, set_id) do
    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  @spec get_performed_set_with_exercise(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def get_performed_set_with_exercise(business_id, set_id) do
    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> PerformedSet.with_exercise(business_id)
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  @spec get_client_performed_set(String.t(), String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found}
  def get_client_performed_set(business_id, client_id, set_id) do
    session_ids =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.for_client(client_id)
      |> select([s], s.id)

    PerformedSet
    |> PerformedSet.for_business(business_id)
    |> where([p], p.workout_session_id in subquery(session_ids))
    |> PerformedSet.with_exercise(business_id)
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  @spec list_sessions_for_user(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), sessions: [WorkoutSession.t()]}}
          | {:error, :not_found}
  def list_sessions_for_user(business_id, user_id, state, offset, limit) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      list_sessions(business_id, client.id, state, offset, limit)
    end
  end

  @spec ensure_no_active_workout_session(String.t(), String.t()) :: :ok | {:error, Easy.Error.t()}
  def ensure_no_active_workout_session(business_id, client_id) do
    exists =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.for_client(client_id)
      |> WorkoutSession.with_state(:active)
      |> Repo.exists?()

    if exists do
      {:error,
       Easy.Error.unprocessable(%{
         session: ["you already have an active workout session — finish or discard it first"]
       })}
    else
      :ok
    end
  end

  @spec create_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t() | Easy.Error.t()}
  def create_workout_session(business_id, client_id, attrs) do
    with {:ok, _client} <- get_client(business_id, client_id),
         :ok <- ensure_no_active_workout_session(business_id, client_id),
         :ok <- ensure_optional_workout(business_id, Map.get(attrs, "workout_id")) do
      business_id
      |> WorkoutSession.insert_changeset(client_id, attrs)
      |> put_planned_snapshot(business_id)
      |> Repo.insert()
      |> preload_session()
    end
  end

  @spec create_client_workout_session_for_user(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t() | Easy.Error.t()}
  def create_client_workout_session_for_user(business_id, user_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id) do
      create_client_workout_session(business_id, client.id, attrs)
    end
  end

  @spec create_client_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t() | Easy.Error.t()}
  def create_client_workout_session(business_id, client_id, attrs) do
    with :ok <- ensure_no_active_workout_session(business_id, client_id),
         {:ok, changeset} <-
           business_id
           |> WorkoutSession.insert_changeset(client_id, attrs)
           |> validate_client_workout_accessible(business_id, client_id) do
      changeset
      |> put_planned_snapshot(business_id)
      |> Repo.insert()
      |> preload_session()
    end
  end

  @spec update_workout_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def update_workout_session(%WorkoutSession{} = session, attrs) do
    session
    |> WorkoutSession.update_changeset(attrs)
    |> put_planned_snapshot(session.business_id)
    |> Repo.update()
    |> preload_session()
  end

  @spec update_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout_session(business_id, session_id, attrs) do
    with {:ok, session} <- get_session_with_sets(business_id, session_id) do
      update_workout_session(session, attrs)
    end
  end

  @spec update_client_workout_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def update_client_workout_session(%WorkoutSession{} = session, attrs) do
    session
    |> WorkoutSession.client_update_changeset(attrs)
    |> Repo.update()
    |> preload_session()
  end

  @spec update_client_workout_session_for_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_workout_session_for_user(business_id, user_id, session_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, session} <- get_client_session_with_sets(business_id, client.id, session_id) do
      update_client_workout_session(session, attrs)
    end
  end

  @spec complete_workout_session(WorkoutSession.t()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def complete_workout_session(%WorkoutSession{} = session),
    do: complete_workout_session(session, %{})

  @spec complete_workout_session(WorkoutSession.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def complete_workout_session(%WorkoutSession{} = session, attrs) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {key, value} -> {to_string(key), value} end)
      |> Map.merge(%{"ended_at" => DateTime.utc_now(), "state" => :completed})

    session
    |> WorkoutSession.update_changeset(attrs)
    |> Repo.update()
    |> preload_session()
  end

  @spec complete_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def complete_workout_session(business_id, session_id, attrs) do
    with {:ok, session} <- get_session_with_sets(business_id, session_id) do
      complete_workout_session(session, attrs)
    end
  end

  @spec complete_client_workout_session_for_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def complete_client_workout_session_for_user(business_id, user_id, session_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, session} <- get_client_session_with_sets(business_id, client.id, session_id) do
      complete_workout_session(session, attrs)
    end
  end

  @spec discard_workout_session(WorkoutSession.t()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def discard_workout_session(%WorkoutSession{} = session) do
    session
    |> WorkoutSession.update_changeset(%{"state" => :discarded})
    |> Repo.update()
    |> preload_session()
  end

  @spec discard_workout_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def discard_workout_session(business_id, session_id) do
    with {:ok, session} <- get_session_with_sets(business_id, session_id) do
      discard_workout_session(session)
    end
  end

  @spec discard_client_workout_session_for_user(String.t(), String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def discard_client_workout_session_for_user(business_id, user_id, session_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, session} <- get_client_session_with_sets(business_id, client.id, session_id) do
      discard_workout_session(session)
    end
  end

  @spec delete_workout_session(WorkoutSession.t()) ::
          {:ok, WorkoutSession.t()} | {:error, Ecto.Changeset.t()}
  def delete_workout_session(%WorkoutSession{} = session), do: Repo.delete(session)

  @spec delete_workout_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout_session(business_id, session_id) do
    with {:ok, session} <- get_session_with_sets(business_id, session_id) do
      delete_workout_session(session)
    end
  end

  @spec create_performed_set(String.t(), String.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_performed_set(workout_session_id, business_id, attrs) do
    with {:ok, _session} <- get_session(business_id, workout_session_id),
         {:ok, changeset} <-
           workout_session_id
           |> PerformedSet.insert_changeset(business_id, attrs)
           |> validate_performed_set_context() do
      changeset
      |> Repo.insert()
      |> preload_set()
    end
  end

  @spec create_client_performed_set_for_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_client_performed_set_for_user(business_id, user_id, workout_session_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, _session} <- get_client_session(business_id, client.id, workout_session_id) do
      create_performed_set(workout_session_id, business_id, attrs)
    end
  end

  @spec update_performed_set(PerformedSet.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_performed_set(%PerformedSet{} = set, attrs) do
    with {:ok, changeset} <-
           set
           |> PerformedSet.update_changeset(attrs)
           |> validate_performed_set_context() do
      changeset
      |> Repo.update()
      |> preload_set()
    end
  end

  @spec update_performed_set(String.t(), String.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_performed_set(business_id, set_id, attrs) do
    with {:ok, set} <- get_performed_set_with_exercise(business_id, set_id) do
      update_performed_set(set, attrs)
    end
  end

  @spec update_client_performed_set_for_user(String.t(), String.t(), String.t(), map()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_performed_set_for_user(business_id, user_id, set_id, attrs) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, set} <- get_client_performed_set(business_id, client.id, set_id) do
      update_performed_set(set, attrs)
    end
  end

  @spec delete_performed_set(PerformedSet.t()) ::
          {:ok, PerformedSet.t()} | {:error, Ecto.Changeset.t()}
  def delete_performed_set(%PerformedSet{} = set), do: Repo.delete(set)

  @spec delete_performed_set(String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_performed_set(business_id, set_id) do
    with {:ok, set} <- get_performed_set(business_id, set_id) do
      delete_performed_set(set)
    end
  end

  @spec delete_client_performed_set_for_user(String.t(), String.t(), String.t()) ::
          {:ok, PerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_performed_set_for_user(business_id, user_id, set_id) do
    with {:ok, client} <- get_client_for_user(business_id, user_id),
         {:ok, set} <- get_client_performed_set(business_id, client.id, set_id) do
      delete_performed_set(set)
    end
  end

  defp get_client(_business_id, nil), do: {:error, :not_found}
  defp get_client(_business_id, ""), do: {:error, :not_found}

  defp get_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp get_client_for_user(business_id, user_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.for_user(user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: WorkoutSession.for_client(query, client_id)

  defp ensure_optional_workout(_business_id, nil), do: :ok
  defp ensure_optional_workout(_business_id, ""), do: :ok

  defp ensure_optional_workout(business_id, workout_id) do
    case Workout |> Workout.for_business(business_id) |> Repo.get(workout_id) do
      nil -> {:error, :not_found}
      _workout -> :ok
    end
  end

  defp validate_client_workout_accessible(%{valid?: false} = changeset, _business_id, _client_id),
    do: {:ok, changeset}

  defp validate_client_workout_accessible(changeset, business_id, client_id) do
    case get_field(changeset, :workout_id) do
      nil ->
        {:ok, changeset}

      workout_id ->
        today = Date.utc_today()

        exists? =
          Workout
          |> Workout.for_business(business_id)
          |> join(:inner, [w], t in TrainingPlan,
            on:
              t.id == w.training_plan_id and t.business_id == ^business_id and
                t.client_id == ^client_id
          )
          |> where(
            [w, t],
            w.id == ^workout_id and t.status == ^:active and t.start_date <= ^today and
              t.end_date >= ^today
          )
          |> Repo.exists?()

        if exists?, do: {:ok, changeset}, else: {:error, :not_found}
    end
  end

  defp put_planned_snapshot(changeset, business_id) do
    case get_field(changeset, :workout_id) do
      nil ->
        changeset

      workout_id ->
        case build_snapshot(business_id, workout_id) do
          nil -> add_error(changeset, :workout_id, "does not exist")
          snapshot -> put_change(changeset, :planned_snapshot, snapshot)
        end
    end
  end

  defp build_snapshot(business_id, workout_id) do
    element_query =
      WorkoutElement
      |> WorkoutElement.for_business(business_id)
      |> WorkoutElement.ordered()
      |> WorkoutElement.with_exercise(business_id)

    Workout
    |> Workout.for_business(business_id)
    |> Repo.get(workout_id)
    |> case do
      nil ->
        nil

      workout ->
        workout = Repo.preload(workout, workout_elements: element_query)

        %{
          "workout_name" => workout.name,
          "elements" => Enum.map(workout.workout_elements, &WorkoutElement.to_snapshot/1)
        }
    end
  end

  defp validate_performed_set_context(%{valid?: false} = changeset), do: {:ok, changeset}

  defp validate_performed_set_context(changeset) do
    case validate_exercise_in_business(changeset) do
      {:ok, changeset} -> {:ok, validate_workout_element_matches_session(changeset)}
      error -> error
    end
  end

  defp validate_exercise_in_business(changeset) do
    business_id = get_field(changeset, :business_id)
    exercise_id = get_field(changeset, :exercise_id)

    cond do
      is_nil(business_id) || is_nil(exercise_id) ->
        {:ok, changeset}

      Exercise |> Exercise.for_business(business_id) |> Repo.get(exercise_id) ->
        {:ok, changeset}

      true ->
        {:error, :not_found}
    end
  end

  defp validate_workout_element_matches_session(changeset) do
    element_id = get_field(changeset, :workout_element_id)
    exercise_id = get_field(changeset, :exercise_id)
    session_id = get_field(changeset, :workout_session_id)
    business_id = get_field(changeset, :business_id)

    cond do
      is_nil(element_id) ->
        changeset

      is_nil(exercise_id) || is_nil(session_id) || is_nil(business_id) ->
        changeset

      workout_element_matches_session?(business_id, session_id, element_id, exercise_id) ->
        changeset

      true ->
        add_error(changeset, :workout_element_id, "must belong to the session workout")
    end
  end

  defp workout_element_matches_session?(business_id, session_id, element_id, exercise_id) do
    case WorkoutSession |> WorkoutSession.for_business(business_id) |> Repo.get(session_id) do
      nil ->
        false

      session ->
        if usable_snapshot?(session.planned_snapshot) do
          element_in_snapshot?(session.planned_snapshot, element_id, exercise_id)
        else
          element_in_session_workout?(business_id, session.workout_id, element_id, exercise_id)
        end
    end
  end

  defp usable_snapshot?(%{"elements" => elements}) when is_list(elements), do: true
  defp usable_snapshot?(_), do: false

  defp element_in_session_workout?(_business_id, nil, _element_id, _exercise_id), do: false

  defp element_in_session_workout?(business_id, workout_id, element_id, exercise_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> WorkoutElement.for_workout(workout_id)
    |> where([e], e.exercise_id == ^exercise_id)
    |> Repo.get(element_id)
    |> is_struct(WorkoutElement)
  end

  defp element_in_snapshot?(%{"elements" => elements}, element_id, exercise_id)
       when is_list(elements) do
    Enum.any?(elements, fn element ->
      element["element_id"] == element_id && element["exercise_id"] == exercise_id
    end)
  end

  defp element_in_snapshot?(_, _element_id, _exercise_id), do: false

  defp preload_session({:ok, %WorkoutSession{} = session}) do
    set_query =
      PerformedSet
      |> PerformedSet.for_business(session.business_id)
      |> PerformedSet.ordered()
      |> PerformedSet.with_exercise(session.business_id)

    {:ok, Repo.preload(session, performed_sets: set_query)}
  end

  defp preload_session(error), do: error

  defp preload_set({:ok, %PerformedSet{} = set}) do
    {:ok, Repo.preload(set, exercise: Exercise.for_business(set.business_id))}
  end

  defp preload_set(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
