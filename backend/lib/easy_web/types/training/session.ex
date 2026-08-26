defmodule EasyWeb.Types.Training.SessionPlannedSet do
  use EasyWeb.Type

  @type t :: %{
          required(:set_type) => :working | :warmup | :dropset | nil,
          required(:reps) => String.t() | nil,
          required(:load_value) => Decimal.t() | nil,
          required(:load_unit) => :kg | :lbs | :bodyweight | :none | nil,
          required(:duration_seconds) => non_neg_integer() | nil,
          required(:distance_value) => Decimal.t() | nil,
          required(:distance_unit) => :meters | :km | :miles | :none | nil,
          required(:rpe) => number() | nil,
          required(:rest_seconds) => non_neg_integer() | nil,
          required(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Training.SessionSnapshotPlan do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:revision) => pos_integer()
        }
end

defmodule EasyWeb.Types.Training.SessionSnapshotExercise do
  use EasyWeb.Type

  @type t :: %{
          required(:ref) => String.t(),
          required(:position) => non_neg_integer(),
          required(:exercise_id) => String.t(),
          required(:exercise_name) => String.t(),
          required(:tracking_type) =>
            :weight_reps
            | :bodyweight_reps
            | :weighted_bodyweight
            | :assisted_bodyweight
            | :reps_only
            | :duration
            | :weight_duration
            | :distance_duration
            | :weight_distance,
          required(:sets) => [EasyWeb.Types.Training.SessionPlannedSet.t()]
        }
end

defmodule EasyWeb.Types.Training.SessionSnapshotWorkout do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:exercises) => [EasyWeb.Types.Training.SessionSnapshotExercise.t()]
        }
end

defmodule EasyWeb.Types.Training.SessionPrescriptionSnapshot do
  use EasyWeb.Type

  @type t :: %{
          required(:version) => pos_integer(),
          required(:plan) => EasyWeb.Types.Training.SessionSnapshotPlan.t(),
          required(:workout) => EasyWeb.Types.Training.SessionSnapshotWorkout.t()
        }
end

defmodule EasyWeb.Types.Training.Session do
  use EasyWeb.Type

  alias Easy.Training.TrainingSession

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :planned | :freestyle,
          required(:date) => Date.t(),
          required(:started_at) => DateTime.t(),
          required(:closed_at) => DateTime.t() | nil,
          required(:state) => :active | :completed | :discarded,
          required(:soreness_rating) => pos_integer() | nil,
          required(:notes) => String.t() | nil,
          optional(:client_id) => String.t() | nil,
          required(:snapshot_version) => pos_integer() | nil,
          required(:prescription_snapshot) => EasyWeb.Types.Training.SessionPrescriptionSnapshot.t() | nil,
          required(:source_plan_id) => String.t() | nil,
          required(:source_workout_id) => String.t() | nil,
          required(:performed_sets) => [EasyWeb.Types.Training.PerformedSet.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          optional(:training_workout_id) => String.t() | nil,
          optional(:soreness_rating) => pos_integer() | nil,
          optional(:notes) => String.t() | nil
        }

  @type update :: %{
          optional(:soreness_rating) => pos_integer(),
          optional(:notes) => String.t()
        }

  @type list_query :: %{
          optional(:from) => Date.t(),
          optional(:to) => Date.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer()
        }

  @spec format(TrainingSession.t() | t()) :: t()
  def format(%TrainingSession{} = session) do
    %{
      id: session.id,
      kind: session.kind,
      date: session.date,
      started_at: session.started_at,
      closed_at: session.closed_at,
      state: session.state,
      soreness_rating: session.soreness_rating,
      notes: session.notes,
      client_id: session.client_id,
      snapshot_version: session.snapshot_version,
      prescription_snapshot: format_snapshot(session.prescription_snapshot),
      source_plan_id: session.source_plan_id,
      source_workout_id: session.source_workout_id,
      performed_sets: format_sets(session.performed_sets),
      inserted_at: session.inserted_at,
      updated_at: session.updated_at
    }
  end

  def format(
        %{
          id: _id,
          kind: _kind,
          date: _date,
          started_at: _started_at,
          closed_at: _closed_at,
          state: _state,
          soreness_rating: _soreness_rating,
          notes: _notes,
          snapshot_version: _snapshot_version,
          prescription_snapshot: _prescription_snapshot,
          source_plan_id: _source_plan_id,
          source_workout_id: _source_workout_id,
          performed_sets: _performed_sets,
          inserted_at: _inserted_at,
          updated_at: _updated_at
        } = session
      ),
      do: session

  @spec client_format(TrainingSession.t()) :: t()
  def client_format(%TrainingSession{} = session) do
    session
    |> format()
    |> Map.delete(:client_id)
  end

  defp format_snapshot(nil), do: nil

  defp format_snapshot(snapshot) when is_map(snapshot) do
    %{
      version: field(snapshot, :version),
      plan: format_snapshot_plan(field(snapshot, :plan)),
      workout: format_snapshot_workout(field(snapshot, :workout))
    }
  end

  defp format_snapshot_plan(plan) do
    %{id: field(plan, :id), name: field(plan, :name), revision: field(plan, :revision)}
  end

  defp format_snapshot_workout(workout) do
    %{
      id: field(workout, :id),
      name: field(workout, :name),
      exercises: Enum.map(field(workout, :exercises), &format_snapshot_exercise/1)
    }
  end

  defp format_snapshot_exercise(exercise) do
    %{
      ref: field(exercise, :ref),
      position: field(exercise, :position),
      exercise_id: field(exercise, :exercise_id),
      exercise_name: field(exercise, :exercise_name),
      tracking_type: field(exercise, :tracking_type),
      sets: Enum.map(field(exercise, :sets), &format_snapshot_set/1)
    }
  end

  defp format_snapshot_set(set) do
    %{
      set_type: field(set, :set_type),
      reps: field(set, :reps),
      load_value: field(set, :load_value),
      load_unit: field(set, :load_unit),
      duration_seconds: field(set, :duration_seconds),
      distance_value: field(set, :distance_value),
      distance_unit: field(set, :distance_unit),
      rpe: field(set, :rpe),
      rest_seconds: field(set, :rest_seconds),
      notes: field(set, :notes)
    }
  end

  defp format_sets(%Ecto.Association.NotLoaded{}) do
    raise ArgumentError, "#{inspect(__MODULE__)} performed_sets is not loaded"
  end

  defp format_sets(sets) when is_list(sets), do: sets

  defp field(map, name) when is_map(map), do: Map.get(map, name, Map.get(map, Atom.to_string(name)))
end
