defmodule Easy.Training.Library.ExerciseMuscle do
  use Easy.Training.Schema

  alias Easy.Training.Library.{Exercise, Muscle}

  schema "exercise_muscles" do
    belongs_to :exercise, Exercise
    belongs_to :muscle, Muscle

    field :role, Ecto.Enum, values: [:primary, :secondary, :stabilizer], default: :primary

    timestamps()
  end

  @doc false
  def changeset(exercise_muscle, attrs) do
    exercise_muscle
    |> cast(attrs, [:role])
    |> validate_required([:exercise_id, :muscle_id])
    |> unique_constraint([:exercise_id, :muscle_id])
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:muscle_id)
  end
end
