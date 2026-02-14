defmodule Easy.Training do
  alias Easy.Clients.Client
  alias Easy.Repo

  alias Easy.Training.{
    Equipment,
    Exercise,
    Muscle,
    PlannedWorkout,
    TrainingPlan,
    WorkoutElement,
    WorkoutSession
  }

  @spec list_exercises(String.t(), map()) :: {:ok, {list(Exercise.t()), map()}}
  def list_exercises(business_id, params \\ %{}) do
    offset = parse_int_param(params, "offset", 0)
    limit = parse_int_param(params, "limit", 50)
    search = Map.get(params, "search", "")
    muscle_ids = parse_list_param(Map.get(params, "muscle_ids"))

    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    count = Repo.aggregate(base, :count, :id)

    exercises =
      base
      |> Exercise.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> Exercise.with_preloads()
      |> Repo.all()

    {:ok, {exercises, %{count: count, offset: offset, limit: limit}}}
  end

  @spec fetch_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_exercise(business_id, id) do
    case Exercise
         |> Exercise.for_business(business_id)
         |> Exercise.with_preloads()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      exercise -> {:ok, exercise}
    end
  end

  @spec create_exercise(String.t(), map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(business_id, attrs), do: Exercise.create(business_id, attrs)

  @spec update_exercise(String.t(), String.t(), map()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_exercise(business_id, id, attrs) do
    case fetch_exercise_for_mutation(business_id, id) do
      {:error, :not_found} -> {:error, :not_found}
      exercise -> Exercise.update(exercise, attrs)
    end
  end

  @spec delete_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found | any()}
  def delete_exercise(business_id, id) do
    case fetch_exercise_for_mutation(business_id, id) do
      {:error, :not_found} -> {:error, :not_found}
      exercise -> Exercise.delete(exercise)
    end
  end

  @spec duplicate_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(business_id, id) do
    with {:ok, exercise} <- fetch_exercise(business_id, id) do
      Exercise.duplicate(exercise, business_id)
    end
  end

  @spec list_muscles(map()) :: {:ok, list(Muscle.t())}
  def list_muscles(params \\ %{}) do
    search = Map.get(params, "search", "")

    muscles =
      Muscle
      |> Muscle.search(search)
      |> Muscle.alphabetical()
      |> Repo.all()

    {:ok, muscles}
  end

  @spec list_equipment(map()) :: {:ok, list(Equipment.t())}
  def list_equipment(params \\ %{}) do
    search = Map.get(params, "search", "")

    equipment =
      Equipment
      |> Equipment.search(search)
      |> Equipment.alphabetical()
      |> Repo.all()

    {:ok, equipment}
  end

  @spec list_training_plans(String.t(), map()) :: {:ok, {list(TrainingPlan.t()), map()}}
  def list_training_plans(business_id, params \\ %{}) do
    offset = parse_int_param(params, "offset", 0)
    limit = parse_int_param(params, "limit", 50)
    search = Map.get(params, "search", "")
    client_id = Map.get(params, "client_id")
    status = parse_enum_param(params, "status", TrainingPlan.statuses())
    template = parse_bool_param(params, "is_template")

    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.search(search)
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.is_template(template)
      |> maybe_for_client(client_id)

    count = Repo.aggregate(base, :count, :id)

    plans =
      base
      |> TrainingPlan.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> TrainingPlan.with_workouts()
      |> Repo.all()

    {:ok, {plans, %{count: count, offset: offset, limit: limit}}}
  end

  @spec fetch_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_training_plan(business_id, id) do
    case TrainingPlan
         |> TrainingPlan.for_business(business_id)
         |> TrainingPlan.with_workouts()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      plan -> {:ok, plan}
    end
  end

  @spec create_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def create_training_plan(business_id, author_id, attrs) do
    TrainingPlan.create(business_id, author_id, attrs)
  end

  @spec update_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_training_plan(business_id, id, attrs) do
    case TrainingPlan |> TrainingPlan.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      plan -> TrainingPlan.update(plan, attrs)
    end
  end

  @spec delete_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_training_plan(business_id, id) do
    case TrainingPlan |> TrainingPlan.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      plan -> TrainingPlan.delete(plan)
    end
  end

  @spec duplicate_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_training_plan(business_id, id) do
    with {:ok, plan} <- fetch_training_plan(business_id, id) do
      TrainingPlan.duplicate(plan)
    end
  end

  @spec assign_training_plan(
          String.t(),
          String.t(),
          String.t(),
          String.t() | nil,
          String.t() | nil
        ) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def assign_training_plan(business_id, id, client_id, start_date, end_date) do
    with {:ok, plan} <- fetch_training_plan(business_id, id),
         true <- client_accessible?(business_id, client_id) do
      TrainingPlan.assign_to_client(plan, client_id, start_date, end_date)
    else
      false -> {:error, :not_found}
      error -> error
    end
  end

  @spec list_planned_workouts(String.t(), String.t(), map()) ::
          {:ok, {list(PlannedWorkout.t()), map()}} | {:error, :not_found}
  def list_planned_workouts(business_id, plan_id, params \\ %{}) do
    offset = parse_int_param(params, "offset", 0)
    limit = parse_int_param(params, "limit", 50)

    with true <- training_plan_accessible?(business_id, plan_id) do
      base =
        PlannedWorkout
        |> PlannedWorkout.for_business(business_id)
        |> PlannedWorkout.for_plan(plan_id)

      count = Repo.aggregate(base, :count, :id)

      workouts =
        base
        |> PlannedWorkout.ordered()
        |> Easy.Utils.paginate(offset, limit)
        |> PlannedWorkout.with_elements()
        |> Repo.all()

      {:ok, {workouts, %{count: count, offset: offset, limit: limit}}}
    else
      _ -> {:error, :not_found}
    end
  end

  @spec fetch_planned_workout(String.t(), String.t()) ::
          {:ok, PlannedWorkout.t()} | {:error, :not_found}
  def fetch_planned_workout(business_id, id) do
    case PlannedWorkout
         |> PlannedWorkout.for_business(business_id)
         |> PlannedWorkout.with_elements()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      workout -> {:ok, workout}
    end
  end

  @spec create_planned_workout(String.t(), String.t(), map()) ::
          {:ok, PlannedWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_planned_workout(business_id, plan_id, attrs) do
    if training_plan_accessible?(business_id, plan_id) do
      PlannedWorkout.create(plan_id, business_id, attrs)
    else
      {:error, :not_found}
    end
  end

  @spec update_planned_workout(String.t(), String.t(), map()) ::
          {:ok, PlannedWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_planned_workout(business_id, id, attrs) do
    case fetch_planned_workout_for_mutation(business_id, id) do
      {:error, :not_found} -> {:error, :not_found}
      workout -> PlannedWorkout.update(workout, attrs)
    end
  end

  @spec delete_planned_workout(String.t(), String.t()) ::
          {:ok, PlannedWorkout.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_planned_workout(business_id, id) do
    case fetch_planned_workout_for_mutation(business_id, id) do
      {:error, :not_found} -> {:error, :not_found}
      workout -> PlannedWorkout.delete(workout)
    end
  end

  @spec fetch_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element(business_id, id) do
    case WorkoutElement
         |> WorkoutElement.for_business(business_id)
         |> WorkoutElement.with_exercise()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      element -> {:ok, element}
    end
  end

  @spec create_workout_element(String.t(), String.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout_element(business_id, planned_workout_id, attrs) do
    with true <- planned_workout_accessible?(business_id, planned_workout_id),
         :ok <- validate_exercise_access(business_id, attrs) do
      WorkoutElement.create(planned_workout_id, business_id, attrs)
    else
      _ -> {:error, :not_found}
    end
  end

  @spec update_workout_element(String.t(), String.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_workout_element(business_id, id, attrs) do
    with {:ok, element} <- fetch_workout_element(business_id, id),
         :ok <- validate_exercise_access(business_id, attrs) do
      WorkoutElement.update(element, attrs)
    else
      {:error, :not_found} -> {:error, :not_found}
      _ -> {:error, :not_found}
    end
  end

  @spec delete_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout_element(business_id, id) do
    case fetch_workout_element_for_mutation(business_id, id) do
      {:error, :not_found} -> {:error, :not_found}
      element -> WorkoutElement.delete(element)
    end
  end

  @spec list_workout_sessions(String.t(), map()) :: {:ok, {list(WorkoutSession.t()), map()}}
  def list_workout_sessions(business_id, params \\ %{}) do
    offset = parse_int_param(params, "offset", 0)
    limit = parse_int_param(params, "limit", 50)
    client_id = Map.get(params, "client_id")
    state = parse_enum_param(params, "state", WorkoutSession.states())

    base =
      WorkoutSession
      |> WorkoutSession.for_business(business_id)
      |> WorkoutSession.with_state(state)
      |> maybe_for_client_session(client_id)

    count = Repo.aggregate(base, :count, :id)

    sessions =
      base
      |> WorkoutSession.newest()
      |> Easy.Utils.paginate(offset, limit)
      |> WorkoutSession.with_sets()
      |> Repo.all()

    {:ok, {sessions, %{count: count, offset: offset, limit: limit}}}
  end

  @spec fetch_workout_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found}
  def fetch_workout_session(business_id, id) do
    case WorkoutSession
         |> WorkoutSession.for_business(business_id)
         |> WorkoutSession.with_sets()
         |> Repo.get(id) do
      nil -> {:error, :not_found}
      session -> {:ok, session}
    end
  end

  @spec create_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_workout_session(business_id, client_id, attrs) do
    planned_workout_id =
      Map.get(attrs, "planned_workout_id") || Map.get(attrs, :planned_workout_id)

    with true <- client_accessible?(business_id, client_id),
         true <- planned_workout_optional_accessible?(business_id, planned_workout_id) do
      WorkoutSession.create(business_id, client_id, attrs)
    else
      _ -> {:error, :not_found}
    end
  end

  @spec complete_workout_session(String.t(), String.t(), map()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def complete_workout_session(business_id, id, attrs) do
    with {:ok, session} <- fetch_workout_session(business_id, id) do
      WorkoutSession.complete(session, attrs)
    end
  end

  @spec discard_workout_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def discard_workout_session(business_id, id) do
    with {:ok, session} <- fetch_workout_session(business_id, id) do
      WorkoutSession.discard(session)
    end
  end

  @spec delete_workout_session(String.t(), String.t()) ::
          {:ok, WorkoutSession.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_workout_session(business_id, id) do
    with {:ok, session} <- fetch_workout_session(business_id, id) do
      WorkoutSession.delete(session)
    end
  end

  defp fetch_exercise_for_mutation(business_id, id) do
    case Exercise |> Exercise.for_business_only(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      exercise -> exercise
    end
  end

  defp fetch_planned_workout_for_mutation(business_id, id) do
    case PlannedWorkout |> PlannedWorkout.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      workout -> workout
    end
  end

  defp fetch_workout_element_for_mutation(business_id, id) do
    case WorkoutElement |> WorkoutElement.for_business(business_id) |> Repo.get(id) do
      nil -> {:error, :not_found}
      element -> element
    end
  end

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: TrainingPlan.for_client(query, client_id)

  defp maybe_for_client_session(query, nil), do: query
  defp maybe_for_client_session(query, ""), do: query
  defp maybe_for_client_session(query, client_id), do: WorkoutSession.for_client(query, client_id)

  defp parse_int_param(params, key, default) do
    case Map.get(params, key) do
      nil -> default
      int when is_integer(int) -> int
      value when is_binary(value) -> Easy.Utils.safe_int(value) || default
      _ -> default
    end
  end

  defp parse_bool_param(params, key) do
    case Map.get(params, key) do
      nil -> nil
      value -> Easy.Utils.parse_boolean(value)
    end
  end

  defp parse_enum_param(params, key, allowed) do
    case Map.get(params, key) do
      nil -> nil
      value when is_atom(value) -> if value in allowed, do: value, else: nil
      value when is_binary(value) -> Easy.Utils.safe_to_atom(value, allowed)
      _ -> nil
    end
  end

  defp parse_list_param(nil), do: nil
  defp parse_list_param(""), do: nil
  defp parse_list_param(value) when is_list(value), do: value

  defp parse_list_param(value) when is_binary(value) do
    value
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> case do
      [] -> nil
      list -> list
    end
  end

  defp training_plan_accessible?(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> is_struct(TrainingPlan)
  end

  defp client_accessible?(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> is_struct(Client)
  end

  defp exercise_accessible?(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business(business_id)
    |> Repo.get(exercise_id)
    |> is_struct(Exercise)
  end

  defp planned_workout_accessible?(business_id, planned_workout_id) do
    PlannedWorkout
    |> PlannedWorkout.for_business(business_id)
    |> Repo.get(planned_workout_id)
    |> is_struct(PlannedWorkout)
  end

  defp planned_workout_optional_accessible?(_business_id, nil), do: true
  defp planned_workout_optional_accessible?(_business_id, ""), do: true

  defp planned_workout_optional_accessible?(business_id, planned_workout_id) do
    planned_workout_accessible?(business_id, planned_workout_id)
  end

  defp validate_exercise_access(business_id, attrs) do
    case Map.get(attrs, "exercise_id") || Map.get(attrs, :exercise_id) do
      nil ->
        :ok

      exercise_id ->
        if exercise_accessible?(business_id, exercise_id), do: :ok, else: {:error, :not_found}
    end
  end
end
