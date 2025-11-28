defmodule Easy.Training.Library.ExerciseEquipment do
  use Easy.Training.Schema

  alias Easy.Training.Library.{Exercise, Equipment}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_equipment" do
    belongs_to :exercise, Exercise
    belongs_to :equipment, Equipment

    timestamps(type: :utc_datetime_usec)
  end

  @doc false
  def changeset(exercise_equipment, attrs) do
    exercise_equipment
    |> cast(attrs, [:exercise_id, :equipment_id])
    |> validate_required([:exercise_id, :equipment_id])
    |> unique_constraint([:exercise_id, :equipment_id])
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:equipment_id)
  end
end
