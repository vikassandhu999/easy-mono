defmodule EasyWeb.Types.Training.PerformedSet do
  use EasyWeb.Type

  alias Easy.Training.TrainingPerformedSet

  @type t :: %{
          required(:id) => String.t(),
          required(:exercise_name) => String.t(),
          required(:snapshot_exercise_ref) => String.t() | nil,
          required(:set_type) => :working | :warmup | :dropset,
          required(:position) => integer(),
          required(:reps) => String.t() | nil,
          required(:load_value) => Decimal.t() | nil,
          required(:load_unit) => String.t() | nil,
          required(:rpe) => Decimal.t() | nil,
          required(:duration_seconds) => non_neg_integer() | nil,
          required(:distance_value) => Decimal.t() | nil,
          required(:distance_unit) => String.t() | nil,
          required(:notes) => String.t() | nil,
          required(:exercise_id) => String.t() | nil,
          required(:training_session_id) => String.t(),
          required(:exercise) => EasyWeb.Types.TrainingPlanExercise.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          optional(:exercise_name) => String.t() | nil,
          optional(:exercise_id) => String.t() | nil,
          optional(:snapshot_exercise_ref) => String.t() | nil,
          optional(:set_type) => :working | :warmup | :dropset | nil,
          optional(:reps) => String.t() | nil,
          optional(:load_value) => number() | nil,
          optional(:load_unit) => :kg | :lbs | :bodyweight | :none | nil,
          optional(:rpe) => number() | nil,
          optional(:duration_seconds) => non_neg_integer() | nil,
          optional(:distance_value) => number() | nil,
          optional(:distance_unit) => :meters | :km | :miles | :none | nil,
          optional(:notes) => String.t() | nil
        }

  @type update :: %{
          optional(:set_type) => :working | :warmup | :dropset | nil,
          optional(:reps) => String.t() | nil,
          optional(:load_value) => number() | nil,
          optional(:load_unit) => :kg | :lbs | :bodyweight | :none | nil,
          optional(:rpe) => number() | nil,
          optional(:duration_seconds) => non_neg_integer() | nil,
          optional(:distance_value) => number() | nil,
          optional(:distance_unit) => :meters | :km | :miles | :none | nil,
          optional(:notes) => String.t() | nil
        }

  @spec format(TrainingPerformedSet.t()) :: t()
  def format(%TrainingPerformedSet{} = set) do
    %{
      id: set.id,
      exercise_name: set.exercise_name,
      snapshot_exercise_ref: set.snapshot_exercise_ref,
      set_type: set.set_type,
      position: set.position,
      reps: set.reps,
      load_value: set.load_value,
      load_unit: unit(set.load_unit),
      rpe: set.rpe,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: unit(set.distance_unit),
      notes: set.notes,
      exercise_id: set.exercise_id,
      training_session_id: set.training_session_id,
      exercise: set.exercise,
      inserted_at: set.inserted_at,
      updated_at: set.updated_at
    }
  end

  defp unit(nil), do: nil
  defp unit(value) when is_atom(value), do: Atom.to_string(value)
  defp unit(value) when is_binary(value), do: value
end
