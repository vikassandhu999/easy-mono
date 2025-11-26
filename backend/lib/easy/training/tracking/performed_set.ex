defmodule Easy.Training.Tracking.PerformedSet do
  use Easy.Training.Schema

  alias Easy.Training.Tracking.WorkoutSession
  alias Easy.Training.Library.Exercise

  schema "performed_sets" do
    field :position, :integer
    field :reps, :integer
    field :weight_kg, :decimal
    field :rpe, :decimal
    field :rir, :integer
    field :completed, :boolean, default: true
    field :notes, :string

    belongs_to :workout_session, WorkoutSession
    belongs_to :exercise, Exercise

    timestamps()
  end

  @doc false
  def changeset(performed_set, attrs) do
    performed_set
    |> cast(attrs, [
      :position,
      :reps,
      :weight_kg,
      :rpe,
      :rir,
      :completed,
      :notes,
      :workout_session_id,
      :exercise_id
    ])
    |> validate_required([:position, :reps, :weight_kg, :workout_session_id, :exercise_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:reps, greater_than: 0)
    |> validate_number(:weight_kg, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:workout_session_id)
    |> foreign_key_constraint(:exercise_id)
  end
end
