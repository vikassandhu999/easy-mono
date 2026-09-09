defmodule Easy.Training.PrescriptionInput do
  alias Easy.Result
  alias Easy.Training.PrescribedExercise
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout
  alias Easy.Training.WorkoutSchedule

  import Ecto.Changeset

  @max_position 2_147_483_647

  @type workout :: %{
          optional(:id) => String.t() | nil,
          optional(:local_ref) => String.t() | nil,
          optional(:name) => String.t() | nil,
          optional(:position) => integer() | nil,
          required(:prescribed_exercises) => [exercise()]
        }
  @type exercise :: %{
          optional(:id) => String.t() | nil,
          optional(:local_ref) => String.t() | nil,
          optional(:exercise_id) => String.t() | nil,
          optional(:position) => integer() | nil,
          optional(:prescribed_sets) => [map()]
        }
  @type schedule_entry :: %{
          weekday: WorkoutSchedule.weekday(),
          workout_id: String.t() | nil,
          workout_ref: String.t() | nil
        }
  @type t :: %{workouts: [workout()], schedule: [schedule_entry()]}
  @type existing :: %{
          workouts: %{String.t() => TrainingWorkout.t()},
          exercises: %{String.t() => PrescribedExercise.t()}
        }

  @spec parse(TrainingPlan.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def parse(plan, attrs) do
    with {:ok, %{workouts: workouts, schedule: schedule}} <- parse_collections(plan, attrs),
         {:ok, schedule} <- validate_schedule(plan, schedule, workouts) do
      {:ok, %{workouts: workouts, schedule: schedule}}
    end
  end

  defp parse_collections(plan, attrs) do
    with {:ok, %{workouts: workouts, schedule: schedule}} <-
           cast_input(attrs, %{workouts: {:array, :map}, schedule: {:array, :map}}),
         true <- is_list(workouts) and is_list(schedule),
         {:ok, workouts} <- Result.traverse(workouts, &parse_workout/1) do
      {:ok, %{workouts: workouts, schedule: schedule}}
    else
      _error -> {:error, prescription_error(plan, :workouts, "is invalid")}
    end
  end

  defp parse_workout(attrs) do
    types = %{id: :string, local_ref: :string, name: :string, position: :integer, prescribed_exercises: {:array, :map}}

    with {:ok, %{prescribed_exercises: exercises} = workout} <- cast_input(attrs, types),
         true <- is_list(exercises),
         {:ok, exercises} <- Result.traverse(exercises, &parse_exercise/1) do
      {:ok, %{workout | prescribed_exercises: exercises}}
    else
      _error -> {:error, :invalid_workout}
    end
  end

  defp parse_exercise(attrs) do
    types = %{
      id: :string,
      local_ref: :string,
      exercise_id: :string,
      position: :integer,
      prescribed_sets: {:array, :map}
    }

    with {:ok, exercise} <- cast_input(attrs, types),
         sets = Map.get(exercise, :prescribed_sets, []),
         true <- is_list(sets) and Enum.all?(sets, &is_map/1) do
      {:ok, exercise}
    else
      _error -> {:error, :invalid_exercise}
    end
  end

  defp cast_input(attrs, types) when is_map(attrs) and not is_struct(attrs) do
    {%{}, types}
    |> cast(attrs, Map.keys(types), empty_values: [], force_changes: true)
    |> apply_action(:insert)
  end

  defp cast_input(_attrs, _types), do: {:error, :invalid_input}

  @spec validate_nodes(TrainingPlan.t(), [workout()], existing()) :: :ok | {:error, Ecto.Changeset.t()}
  def validate_nodes(plan, workouts, existing) do
    with :ok <- validate_persisted_nodes(plan, workouts, existing),
         :ok <- validate_local_references(plan, workouts) do
      validate_positions(plan, workouts)
    end
  end

  defp validate_persisted_nodes(plan, workouts, existing) do
    if persisted_nodes_valid?(workouts, existing.workouts, existing.exercises) do
      :ok
    else
      {:error, prescription_error(plan, :workouts, "contains an unknown persisted node")}
    end
  end

  defp validate_schedule(plan, schedule, workouts) do
    case Result.traverse(schedule, &parse_schedule_entry/1) do
      {:ok, normalized} -> validate_schedule_references(plan, normalized, workouts)
      _error -> {:error, prescription_error(plan, :workout_schedule, "is invalid")}
    end
  end

  defp validate_schedule_references(plan, normalized, workouts) do
    weekdays = Enum.map(normalized, &Map.get(&1, :weekday))
    requested_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> compact_set()
    requested_refs = workouts |> Enum.map(&Map.get(&1, :local_ref)) |> compact_set()

    valid? =
      length(normalized) == length(WorkoutSchedule.weekdays()) and
        MapSet.new(weekdays) == MapSet.new(WorkoutSchedule.weekdays()) and
        Enum.all?(normalized, &valid_schedule_reference?(&1, requested_ids, requested_refs))

    if valid?,
      do: {:ok, normalized},
      else: {:error, prescription_error(plan, :workout_schedule, "must contain each weekday exactly once")}
  end

  defp parse_schedule_entry(attrs) do
    types = %{weekday: WorkoutSchedule.__schema__(:type, :weekday), workout_id: :string, workout_ref: :string}

    with {:ok, entry} <- cast_input(attrs, types) do
      {:ok, Map.merge(%{weekday: nil, workout_id: nil, workout_ref: nil}, entry)}
    end
  end

  defp valid_schedule_reference?(entry, requested_ids, requested_refs) do
    case {entry.workout_id, entry.workout_ref} do
      {nil, nil} -> true
      {id, nil} -> valid_uuid?(id) and MapSet.member?(requested_ids, id)
      {nil, ref} -> valid_local_ref?(ref) and MapSet.member?(requested_refs, ref)
      {_id, _ref} -> false
    end
  end

  defp persisted_nodes_valid?(workouts, existing_workouts, existing_exercises) do
    workout_ids = workouts |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)
    exercise_ids = prescribed_inputs(workouts) |> Enum.map(&Map.get(&1, :id)) |> Enum.reject(&is_nil/1)

    unique?(workout_ids) and unique?(exercise_ids) and
      Enum.all?(workout_ids, &(valid_uuid?(&1) and Map.has_key?(existing_workouts, &1))) and
      Enum.all?(workouts, &persisted_exercises_belong_to_workout?(&1, existing_exercises))
  end

  defp persisted_exercises_belong_to_workout?(workout, existing_exercises) do
    Enum.all?(Map.get(workout, :prescribed_exercises), fn input ->
      case Map.get(input, :id) do
        nil -> true
        id -> persisted_exercise_belongs?(Map.get(existing_exercises, id), workout)
      end
    end)
  end

  defp persisted_exercise_belongs?(%PrescribedExercise{training_workout_id: workout_id}, workout),
    do: workout_id == Map.get(workout, :id)

  defp persisted_exercise_belongs?(_item, _workout), do: false

  defp validate_local_references(plan, workouts) do
    nodes = workouts ++ prescribed_inputs(workouts)
    refs = nodes |> Enum.map(&Map.get(&1, :local_ref)) |> Enum.reject(&is_nil/1)
    identities_valid? = Enum.all?(nodes, &valid_node_identity?/1)

    if identities_valid? and unique?(refs),
      do: :ok,
      else: {:error, prescription_error(plan, :workouts, "contains invalid or duplicate local references")}
  end

  defp valid_node_identity?(node) do
    case {Map.get(node, :id), Map.get(node, :local_ref)} do
      {id, nil} -> valid_uuid?(id)
      {nil, ref} -> valid_local_ref?(ref)
      {_id, _ref} -> false
    end
  end

  defp validate_positions(plan, workouts) do
    workouts_valid? = unique_nonnegative_positions?(workouts)
    exercises_valid? = Enum.all?(workouts, &(Map.get(&1, :prescribed_exercises) |> unique_nonnegative_positions?()))

    if workouts_valid? and exercises_valid?,
      do: :ok,
      else: {:error, prescription_error(plan, :workouts, "positions must be unique nonnegative integers")}
  end

  defp unique_nonnegative_positions?(nodes) do
    positions = Enum.map(nodes, &Map.get(&1, :position))

    Enum.all?(positions, &valid_position?/1) and unique?(positions)
  end

  defp valid_position?(position), do: is_integer(position) and position >= 0 and position <= @max_position

  defp prescribed_inputs(workouts), do: Enum.flat_map(workouts, &Map.get(&1, :prescribed_exercises))
  defp compact_set(values), do: values |> Enum.reject(&is_nil/1) |> MapSet.new()
  defp unique?(values), do: length(values) == MapSet.size(MapSet.new(values))
  defp valid_uuid?(value), do: match?({:ok, _uuid}, Ecto.UUID.cast(value))
  defp valid_local_ref?(value), do: is_binary(value) and value == String.trim(value) and value != "" and byte_size(value) <= 100
  defp prescription_error(plan, field, message), do: plan |> change() |> add_error(field, message)
end
