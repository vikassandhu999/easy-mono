defmodule Easy.Training.ExerciseMuscle do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_muscles" do
    belongs_to :exercise, Easy.Training.Exercise
    belongs_to :muscle, Easy.Training.Muscle

    field :role, Ecto.Enum, values: [:primary, :secondary, :stabilizer], default: :primary

    timestamps(type: :utc_datetime_usec)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(exercise_muscle, attrs) do
    exercise_muscle
    |> cast(attrs, [:role, :exercise_id, :muscle_id])
    |> validate_required([:exercise_id, :muscle_id])
    |> unique_constraint([:exercise_id, :muscle_id])
  end
end
