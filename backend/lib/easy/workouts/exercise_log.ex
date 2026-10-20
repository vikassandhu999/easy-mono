defmodule Easy.Workouts.ExerciseLog do
  use Ecto.Schema

  alias Easy.Workouts.{Exercise, ResultMeasurements}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "exercise_logs" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:workout_log, Easy.Workouts.WorkoutLog)
    belongs_to(:exercise, Easy.Workouts.Exercise)

    field(:workout_exercise_id, :binary_id)

    field(:state, Ecto.Enum, values: [:active, :completed, :skipped], default: :active)

    field(:side_mode, Ecto.Enum, values: [:combined, :per_side], default: :combined)

    field(:rounds, :integer, default: 1)
    field(:targets_mode, Ecto.Enum, values: [:same_for_all, :per_round], default: :same_for_all)
    embeds_many(:targets, Easy.Workouts.RoundTargets, on_replace: :delete)

    field(:position, :integer)

    field(:reps, :integer)
    field(:weight_kg, :decimal)
    field(:duration_s, :decimal)
    field(:distance_m, :decimal)
    field(:elevation_gain_m, :decimal)
    field(:height_cm, :decimal)
    field(:calories_kcal, :decimal)

    field(:avg_speed_m_s, :decimal)
    field(:incline_pct, :decimal)
    field(:level, :integer)
    field(:avg_power_w, :decimal)
    field(:avg_cadence_per_min, :decimal)
    field(:avg_heart_rate_bpm, :decimal)
    field(:effort, :decimal)

    field(:successes, :integer)
    field(:attempts, :integer)
    field(:score, :decimal)
    field(:result, Ecto.Enum, values: [:win, :draw, :loss])

    embeds_one(:entered_units, Easy.Workouts.ResultUnits, on_replace: :update)

    has_many(:sets, Easy.Workouts.ExerciseSet, preload_order: [asc: :round, asc: :side, asc: :id])

    timestamps(type: :utc_datetime)
  end

  @spec measurements_changeset(t(), map(), Exercise.t()) :: Ecto.Changeset.t()
  def measurements_changeset(log, attrs, exercise),
    do: ResultMeasurements.changeset(log, attrs, exercise, :overall)
end
