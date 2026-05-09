defmodule Easy.Training.Reads do
  alias Easy.Repo
  alias Easy.Training.Equipment
  alias Easy.Training.Exercise
  alias Easy.Training.Muscle
  alias Easy.Training.PerformedSet
  alias Easy.Training.PlanItem
  alias Easy.Training.TrainingPlan
  alias Easy.Training.Workout
  alias Easy.Training.WorkoutElement
  alias Easy.Training.WorkoutSession

  import Ecto.Query

  @spec fetch_plan(String.t(), String.t()) :: {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_plan(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_plan_full(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_plan_full(business_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.with_workouts()
    |> TrainingPlan.with_plan_items()
    |> preload(:client)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_plan_full(String.t(), String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_client_plan_full(business_id, client_id, plan_id) do
    TrainingPlan
    |> TrainingPlan.for_business(business_id)
    |> TrainingPlan.for_client(client_id)
    |> TrainingPlan.with_workouts()
    |> TrainingPlan.with_plan_items()
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec list_template_plans(
          String.t(),
          String.t() | nil,
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_template_plans(business_id, search, status, offset, limit) do
    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.search(search)
      |> TrainingPlan.with_status(status)
      |> TrainingPlan.templates()

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> Repo.all()
     }}
  end

  @spec list_client_plans(
          String.t(),
          String.t(),
          atom() | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), plans: [TrainingPlan.t()]}}
  def list_client_plans(business_id, client_id, status, offset, limit) do
    base =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.for_client(client_id)
      |> TrainingPlan.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans:
         base
         |> TrainingPlan.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> TrainingPlan.with_workouts()
         |> TrainingPlan.with_plan_items()
         |> preload(:client)
         |> Repo.all()
     }}
  end

  @spec fetch_workout(String.t(), String.t()) :: {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_with_elements(String.t(), String.t()) ::
          {:ok, Workout.t()} | {:error, :not_found}
  def fetch_workout_with_elements(business_id, workout_id) do
    Workout
    |> Workout.for_business(business_id)
    |> Workout.with_elements()
    |> Repo.get(workout_id)
    |> ok_or_not_found()
  end

  @spec list_workouts(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), workouts: [Workout.t()]}} | {:error, :not_found}
  def list_workouts(business_id, plan_id, offset, limit) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      base = Workout |> Workout.for_business(business_id) |> Workout.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         workouts:
           base
           |> Workout.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> Workout.with_elements()
           |> Repo.all()
       }}
    end
  end

  @spec fetch_plan_item(String.t(), String.t()) ::
          {:ok, PlanItem.t()} | {:error, :not_found}
  def fetch_plan_item(business_id, plan_item_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> Repo.get(plan_item_id)
    |> ok_or_not_found()
  end

  @spec list_plan_items(String.t(), String.t()) :: {:ok, [PlanItem.t()]} | {:error, :not_found}
  def list_plan_items(business_id, plan_id) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_workout()
        |> Repo.all()

      {:ok, plan_items}
    end
  end

  @spec ensure_workout_for_plan(String.t(), String.t(), String.t() | nil) ::
          {:ok, :valid} | {:error, :not_found}
  def ensure_workout_for_plan(_plan_id, _business_id, nil), do: {:ok, :valid}
  def ensure_workout_for_plan(_plan_id, _business_id, ""), do: {:ok, :valid}

  def ensure_workout_for_plan(plan_id, business_id, workout_id) do
    case Workout
         |> Workout.for_plan(plan_id)
         |> Workout.for_business(business_id)
         |> Repo.get(workout_id) do
      nil -> {:error, :not_found}
      _workout -> {:ok, :valid}
    end
  end

  @spec fetch_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element(business_id, element_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

  @spec fetch_workout_element_with_exercise(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element_with_exercise(business_id, element_id) do
    WorkoutElement
    |> WorkoutElement.for_business(business_id)
    |> WorkoutElement.with_exercise()
    |> Repo.get(element_id)
    |> ok_or_not_found()
  end

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

  @spec fetch_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business(business_id)
    |> Exercise.with_preloads()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec fetch_business_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_business_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business_only(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec list_exercises(
          String.t(),
          String.t() | nil,
          [String.t()] | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), exercises: [Exercise.t()]}}
  def list_exercises(business_id, search, muscle_ids, offset, limit) do
    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       exercises:
         base
         |> Exercise.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Exercise.with_preloads()
         |> Repo.all()
     }}
  end

  @spec list_muscles(String.t() | nil) :: {:ok, [Muscle.t()]}
  def list_muscles(search) do
    muscles =
      Muscle
      |> Muscle.search(search)
      |> Muscle.alphabetical()
      |> Repo.all()

    {:ok, muscles}
  end

  @spec list_equipment(String.t() | nil) :: {:ok, [Equipment.t()]}
  def list_equipment(search) do
    equipment =
      Equipment
      |> Equipment.search(search)
      |> Equipment.alphabetical()
      |> Repo.all()

    {:ok, equipment}
  end

  @spec ensure_exercise(String.t(), String.t() | nil) :: {:ok, :valid} | {:error, :not_found}
  def ensure_exercise(_business_id, nil), do: {:ok, :valid}
  def ensure_exercise(_business_id, ""), do: {:ok, :valid}

  def ensure_exercise(business_id, exercise_id) do
    case Exercise |> Exercise.for_business(business_id) |> Repo.get(exercise_id) do
      nil -> {:error, :not_found}
      _exercise -> {:ok, :valid}
    end
  end

  @spec ensure_workout_element(String.t(), String.t() | nil) ::
          {:ok, :valid} | {:error, :not_found}
  def ensure_workout_element(_business_id, nil), do: {:ok, :valid}
  def ensure_workout_element(_business_id, ""), do: {:ok, :valid}

  def ensure_workout_element(business_id, element_id) do
    case WorkoutElement |> WorkoutElement.for_business(business_id) |> Repo.get(element_id) do
      nil -> {:error, :not_found}
      _element -> {:ok, :valid}
    end
  end

  @spec ensure_workout(String.t(), String.t() | nil) :: {:ok, :valid} | {:error, :not_found}
  def ensure_workout(_business_id, nil), do: {:ok, :valid}
  def ensure_workout(_business_id, ""), do: {:ok, :valid}

  def ensure_workout(business_id, workout_id) do
    case Workout |> Workout.for_business(business_id) |> Repo.get(workout_id) do
      nil -> {:error, :not_found}
      _workout -> {:ok, :valid}
    end
  end

  @spec ensure_client_workout(String.t(), String.t(), String.t() | nil) ::
          {:ok, :valid} | {:error, :not_found}
  def ensure_client_workout(_business_id, _client_id, nil), do: {:ok, :valid}
  def ensure_client_workout(_business_id, _client_id, ""), do: {:ok, :valid}

  def ensure_client_workout(business_id, client_id, workout_id) do
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

    if exists?, do: {:ok, :valid}, else: {:error, :not_found}
  end

  defp maybe_for_client(query, nil), do: query
  defp maybe_for_client(query, ""), do: query
  defp maybe_for_client(query, client_id), do: WorkoutSession.for_client(query, client_id)

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
