defmodule Easy.Training.Library.ExerciseMuscle do
  use Easy.Training.Schema

  alias Easy.Training.Library.{Exercise, Muscle}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_muscles" do
    belongs_to :exercise, Exercise
    belongs_to :muscle, Muscle

    field :role, :string, default: "primary"

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(exercise_muscle, attrs) do
    exercise_muscle
    |> cast(attrs, [:exercise_id, :muscle_id, :role])
    |> validate_required([:exercise_id, :muscle_id])
    |> unique_constraint([:exercise_id, :muscle_id])
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:muscle_id)
  end
end
