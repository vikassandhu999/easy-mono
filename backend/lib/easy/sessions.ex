defmodule Easy.Sessions do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingPerformedSet
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout
  alias Easy.Training.TrainingWorkoutExercise
  alias Easy.Training.TrainingSession

  import Ecto.Changeset
  import Ecto.Query

  # ---------------------------------------------------------------------------
  # Coach read fns (Case-2: Ctx-first, client_id from path)
  # ---------------------------------------------------------------------------

  @spec list_sessions_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [TrainingSession.t()]}
  def list_sessions_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    from = Keyword.get(opts, :from)
    to = Keyword.get(opts, :to)

    sessions =
      TrainingSession
      |> TrainingSession.for_client(ctx.business_id, client_id)
      |> maybe_for_date_range(from, to)
      |> TrainingSession.newest()
      |> TrainingSession.include_sets(ctx.business_id)
      |> Repo.all()

    {:ok, sessions}
  end

  @spec get_session_for_client(Ctx.t(), String.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_session_for_client(%Ctx{} = ctx, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(ctx.business_id, client_id)
    |> TrainingSession.include_sets(ctx.business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  # ---------------------------------------------------------------------------
  # Client self fns (Case-3: Ctx-first, resolves client via private get_client/1)
  # ---------------------------------------------------------------------------

  @spec list_client_sessions(Ctx.t(), keyword()) ::
          {:ok, [TrainingSession.t()]} | {:error, :not_found}
  def list_client_sessions(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- get_client(ctx) do
      list_sessions_for_client_by_id(ctx.business_id, client.id, opts)
    end
  end

  @spec get_client_session(Ctx.t(), String.t()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found}
  def get_client_session(%Ctx{} = ctx, session_id) do
    with {:ok, client} <- get_client(ctx) do
      fetch_client_session_preloaded(ctx.business_id, client.id, session_id)
    end
  end

  @spec create_client_session(Ctx.t(), map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | Ecto.Changeset.t() | Easy.Error.t()}
  def create_client_session(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx) do
      create_client_workout_session(ctx.business_id, client.id, attrs)
    end
  end

  @spec update_client_session(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_session(%Ctx{} = ctx, session_id, attrs) do
    with {:ok, client} <- get_client(ctx),
         {:ok, session} <- fetch_client_session_preloaded(ctx.business_id, client.id, session_id) do
      case to_string(attrs[:state] || "") do
        "completed" -> complete_workout_session(session, attrs)
        "discarded" -> discard_workout_session(session)
        _ -> update_client_workout_session(session, attrs)
      end
    end
  end

  @spec create_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_client_performed_set(%Ctx{} = ctx, session_id, attrs) do
    with {:ok, client} <- get_client(ctx),
         {:ok, _session} <- fetch_client_session(ctx.business_id, client.id, session_id) do
      create_performed_set(session_id, ctx.business_id, attrs)
    end
  end

  @spec update_client_performed_set(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_client_performed_set(%Ctx{} = ctx, set_id, attrs) do
    with {:ok, client} <- get_client(ctx),
         {:ok, set} <- get_client_performed_set(ctx.business_id, client.id, set_id) do
      update_performed_set(set, attrs)
    end
  end

  @spec delete_client_performed_set(Ctx.t(), String.t()) ::
          {:ok, TrainingPerformedSet.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_client_performed_set(%Ctx{} = ctx, set_id) do
    with {:ok, client} <- get_client(ctx),
         {:ok, set} <- get_client_performed_set(ctx.business_id, client.id, set_id) do
      delete_performed_set(set)
    end
  end

  # ---------------------------------------------------------------------------
  # Private helpers
  # ---------------------------------------------------------------------------

  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp list_sessions_for_client_by_id(business_id, client_id, opts) do
    from = Keyword.get(opts, :from)
    to = Keyword.get(opts, :to)

    sessions =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> maybe_for_date_range(from, to)
      |> TrainingSession.newest()
      |> TrainingSession.include_sets(business_id)
      |> Repo.all()

    {:ok, sessions}
  end

  defp fetch_client_session(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp fetch_client_session_preloaded(business_id, client_id, session_id) do
    TrainingSession
    |> TrainingSession.for_client(business_id, client_id)
    |> TrainingSession.include_sets(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp get_client_performed_set(business_id, client_id, set_id) do
    session_ids =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> select([s], s.id)

    TrainingPerformedSet
    |> TrainingPerformedSet.for_business(business_id)
    |> where([p], p.training_session_id in subquery(session_ids))
    |> TrainingPerformedSet.include_exercise(business_id)
    |> Repo.get(set_id)
    |> ok_or_not_found()
  end

  defp create_client_workout_session(business_id, client_id, attrs) do
    attrs = put_default_date(attrs)

    with :ok <- ensure_no_active_workout_session(business_id, client_id),
         {:ok, changeset} <-
           business_id
           |> TrainingSession.insert_changeset(client_id, attrs)
           |> validate_client_workout_accessible(business_id, client_id) do
      changeset
      |> put_planned_snapshot(business_id)
      |> Repo.insert()
      |> preload_session()
    end
  end

  defp update_client_workout_session(%TrainingSession{} = session, attrs) do
    session
    |> TrainingSession.client_update_changeset(attrs)
    |> Repo.update()
    |> preload_session()
  end

  defp complete_workout_session(%TrainingSession{} = session, attrs) do
    attrs =
      attrs
      |> Enum.into(%{}, fn {key, value} -> {to_string(key), value} end)
      |> Map.merge(%{"ended_at" => DateTime.utc_now(), "state" => :completed})

    session
    |> TrainingSession.update_changeset(attrs)
    |> Repo.update()
    |> preload_session()
  end

  defp discard_workout_session(%TrainingSession{} = session) do
    session
    |> TrainingSession.update_changeset(%{"state" => :discarded})
    |> Repo.update()
    |> preload_session()
  end

  defp ensure_no_active_workout_session(business_id, client_id) do
    exists =
      TrainingSession
      |> TrainingSession.for_client(business_id, client_id)
      |> TrainingSession.for_state(:active)
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

  defp get_session(business_id, session_id) do
    TrainingSession
    |> TrainingSession.for_business(business_id)
    |> Repo.get(session_id)
    |> ok_or_not_found()
  end

  defp maybe_for_date_range(query, nil, nil), do: query
  defp maybe_for_date_range(query, from, nil), do: TrainingSession.for_date_from(query, from)
  defp maybe_for_date_range(query, nil, to), do: TrainingSession.for_date_to(query, to)
  defp maybe_for_date_range(query, from, to), do: TrainingSession.for_date_range(query, from, to)

  defp validate_client_workout_accessible(%{valid?: false} = changeset, _business_id, _client_id),
    do: {:ok, changeset}

  defp validate_client_workout_accessible(changeset, business_id, client_id) do
    case get_field(changeset, :training_workout_id) do
      nil ->
        {:ok, changeset}

      workout_id ->
        today = Date.utc_today()

        exists? =
          TrainingWorkout
          |> TrainingWorkout.for_business(business_id)
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
    case get_field(changeset, :training_workout_id) do
      nil ->
        changeset

      workout_id ->
        case build_snapshot(business_id, workout_id) do
          nil -> add_error(changeset, :training_workout_id, "does not exist")
          snapshot -> put_change(changeset, :planned_snapshot, snapshot)
        end
    end
  end

  defp build_snapshot(business_id, workout_id) do
    element_query =
      TrainingWorkoutExercise
      |> TrainingWorkoutExercise.for_business(business_id)
      |> TrainingWorkoutExercise.ordered()
      |> TrainingWorkoutExercise.include_exercise(business_id)

    TrainingWorkout
    |> TrainingWorkout.for_business(business_id)
    |> Repo.get(workout_id)
    |> case do
      nil ->
        nil

      workout ->
        workout = Repo.preload(workout, workout_elements: element_query)

        %{
          "exercises" => Enum.map(workout.workout_elements, &element_to_snapshot/1)
        }
    end
  end

  defp element_to_snapshot(element) do
    %{
      "name" => element.exercise && element.exercise.name,
      "position" => element.position,
      "sets" => Enum.map(element.planned_sets, &Easy.Training.PlannedSet.to_snapshot/1)
    }
  end

  defp put_default_date(attrs) do
    if present?(Map.get(attrs, "date")) or present?(Map.get(attrs, :date)) do
      attrs
    else
      # Normalise to string keys to avoid mixed-key maps when attrs already has atom keys
      normalized = Enum.into(attrs, %{}, fn {k, v} -> {to_string(k), v} end)
      Map.put(normalized, "date", Date.utc_today())
    end
  end

  defp put_exercise_name(attrs, business_id) do
    has_name? =
      present?(Map.get(attrs, "exercise_name")) or present?(Map.get(attrs, :exercise_name))

    exercise_id = attrs[:exercise_id]

    cond do
      has_name? ->
        {:ok, attrs}

      is_nil(exercise_id) ->
        {:ok, attrs}

      true ->
        case TrainingExercise |> TrainingExercise.for_business_or_system(business_id) |> Repo.get(exercise_id) do
          nil -> {:error, :not_found}
          exercise -> {:ok, Map.put(attrs, exercise_name_key(attrs), exercise.name)}
        end
    end
  end

  defp exercise_name_key(attrs) do
    if Map.has_key?(attrs, :exercise_id), do: :exercise_name, else: "exercise_name"
  end

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(_), do: true

  defp validate_performed_set_context(%{valid?: false} = changeset), do: {:ok, changeset}

  defp validate_performed_set_context(changeset) do
    validate_exercise_in_business(changeset)
  end

  defp validate_exercise_in_business(changeset) do
    business_id = get_field(changeset, :business_id)
    exercise_id = get_field(changeset, :exercise_id)

    cond do
      is_nil(business_id) || is_nil(exercise_id) ->
        {:ok, changeset}

      TrainingExercise |> TrainingExercise.for_business_or_system(business_id) |> Repo.get(exercise_id) ->
        {:ok, changeset}

      true ->
        {:error, :not_found}
    end
  end

  defp create_performed_set(session_id, business_id, attrs) do
    with {:ok, _session} <- get_session(business_id, session_id),
         {:ok, attrs} <- put_exercise_name(attrs, business_id),
         {:ok, changeset} <-
           session_id
           |> TrainingPerformedSet.insert_changeset(business_id, attrs)
           |> validate_performed_set_context() do
      changeset
      |> Repo.insert()
      |> preload_set()
    end
  end

  defp update_performed_set(%TrainingPerformedSet{} = set, attrs) do
    with {:ok, changeset} <-
           set
           |> TrainingPerformedSet.update_changeset(attrs)
           |> validate_performed_set_context() do
      changeset
      |> Repo.update()
      |> preload_set()
    end
  end

  defp delete_performed_set(%TrainingPerformedSet{} = set), do: Repo.delete(set)

  defp preload_session({:ok, %TrainingSession{} = session}) do
    business_id = session.business_id

    set_query =
      TrainingPerformedSet
      |> TrainingPerformedSet.for_business(business_id)
      |> TrainingPerformedSet.ordered()
      |> TrainingPerformedSet.include_exercise(business_id)

    {:ok, Repo.preload(session, performed_sets: set_query)}
  end

  defp preload_session(error), do: error

  defp preload_set({:ok, %TrainingPerformedSet{} = set}) do
    {:ok, Repo.preload(set, exercise: TrainingExercise.for_business_or_system(set.business_id))}
  end

  defp preload_set(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
