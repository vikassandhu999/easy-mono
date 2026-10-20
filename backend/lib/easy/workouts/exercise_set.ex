defmodule Easy.Workouts.ExerciseSet do
  use Ecto.Schema

  alias Easy.Workouts.{Exercise, ResultMeasurements}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "exercise_sets" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:exercise_log, Easy.Workouts.ExerciseLog)
    field(:workout_log_id, :binary_id)
    field(:exercise_id, :binary_id)

    field(:workout_exercise_id, :binary_id)
    field(:state, Ecto.Enum, values: [:completed, :skipped])
    field(:round, :integer)
    field(:side, Ecto.Enum, values: [:left, :right])

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
    field(:reserve, :decimal)

    field(:successes, :integer)
    field(:attempts, :integer)
    field(:score, :decimal)
    field(:result, Ecto.Enum, values: [:win, :draw, :loss])
    field(:speed_m_s, :decimal)
    field(:power_w, :decimal)
    field(:cadence_rpm, :integer)
    field(:heart_rate_bpm, :integer)
    field(:grade, :string)

    embeds_one(:entered_units, Easy.Workouts.ResultUnits, on_replace: :update)

    timestamps(type: :utc_datetime)
  end

  @spec measurements_changeset(t(), map(), Exercise.t()) :: Ecto.Changeset.t()
  def measurements_changeset(set, attrs, exercise),
    do: ResultMeasurements.changeset(set, attrs, exercise, :detail)
end
