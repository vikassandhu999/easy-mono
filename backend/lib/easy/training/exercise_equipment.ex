defmodule Easy.Training.ExerciseEquipment do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_equipment" do
    belongs_to :exercise, Easy.Training.Exercise
    belongs_to :equipment, Easy.Training.Equipment

    timestamps(type: :utc_datetime_usec)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(exercise_equipment, attrs) do
    exercise_equipment
    |> cast(attrs, [:exercise_id, :equipment_id])
    |> validate_required([:exercise_id, :equipment_id])
    |> unique_constraint([:exercise_id, :equipment_id])
  end
end
