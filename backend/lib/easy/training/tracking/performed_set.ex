defmodule Easy.Training.Tracking.PerformedSet do
  use Easy.Training.Schema

  alias Easy.Organizations.Business
  alias Easy.Training.Tracking.WorkoutSession
  alias Easy.Training.Library.Exercise

  schema "performed_sets" do
    field :position, :integer

    # === ACTUAL PERFORMANCE ===
    # Stores actual reps performed: "10", "AMRAP:15" (if AMRAP target, got 15)
    field :actual_reps, :string

    # === INTENSITY (what was actually done) ===
    # Actual weight/resistance
    field :load_value, :decimal

    field :load_unit, Ecto.Enum,
      values: [:kg, :lbs, :bodyweight, :percent_1rm, :none],
      default: :none

    # "RPE 8.5", "Very hard", "Zone 3"
    field :intensity_felt, :string
    # Parsed RPE (1.0-10.0)
    field :rpe, :decimal
    # Reps in reserve (0-5+)
    field :rir, :integer

    # === TIME/DISTANCE (actual cardio performance) ===
    # Actual time taken
    field :duration_seconds, :integer
    # Actual distance covered
    field :distance_value, :decimal

    field :distance_unit, Ecto.Enum,
      values: [:meters, :km, :miles, :yards, :none],
      default: :none

    # === EXECUTION ===
    field :tempo_actual, :string
    field :completed, :boolean, default: true
    field :notes, :string

    belongs_to :business, Business
    belongs_to :workout_session, WorkoutSession
    belongs_to :exercise, Exercise

    timestamps()
  end

  @doc false
  def changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, [
      :position,
      :actual_reps,
      :load_value,
      :load_unit,
      :intensity_felt,
      :rpe,
      :rir,
      :duration_seconds,
      :distance_value,
      :distance_unit,
      :tempo_actual,
      :completed,
      :notes,
      :exercise_id
    ])
    |> validate_required([:position, :workout_session_id, :exercise_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_at_least_one_performance_metric()
    |> validate_distance_requires_unit()
    |> unique_constraint([:workout_session_id, :position],
      name: :performed_sets_workout_session_id_position_index,
      message: "position already exists in this workout session"
    )
    |> foreign_key_constraint(:workout_session_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:business_id)
  end

  defp validate_at_least_one_performance_metric(changeset) do
    has_reps = get_field(changeset, :actual_reps)
    has_duration = get_field(changeset, :duration_seconds)
    has_distance = get_field(changeset, :distance_value)

    if !has_reps && !has_duration && !has_distance do
      add_error(
        changeset,
        :actual_reps,
        "must have at least one metric: reps, duration, or distance"
      )
    else
      changeset
    end
  end

  defp validate_distance_requires_unit(changeset) do
    distance = get_field(changeset, :distance_value)
    unit = get_field(changeset, :distance_unit)

    if distance && (!unit || unit == :none) do
      add_error(changeset, :distance_unit, "required when distance_value is set")
    else
      changeset
    end
  end
end
