defmodule Easy.Training.Library.Exercise do
  use Easy.Training.Schema
  import Ecto.Query, warn: false

  alias Easy.Orgs.Business

  schema "exercises" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :mechanics, Ecto.Enum, values: [:compound, :isolation, :isometric]
    field :force, Ecto.Enum, values: [:push, :pull, :static]
    field :images, {:array, :string}, default: []

    # Hybrid scope: null for system exercises, UUID for business-specific
    belongs_to :business, Business

    has_many :exercise_muscles, Easy.Training.Library.ExerciseMuscle, on_replace: :delete
    has_many :muscles, through: [:exercise_muscles, :muscle]

    has_many :exercise_equipment, Easy.Training.Library.ExerciseEquipment, on_replace: :delete
    has_many :equipment, through: [:exercise_equipment, :equipment]

    timestamps()
  end

  def changeset(exercise, attrs) do
    exercise
    |> cast(attrs, [:name, :description, :instructions, :mechanics, :force, :images])
    |> validate_required([:name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 5000)
    |> validate_length(:instructions, max: 10000)
    |> put_muscle_ids(attrs)
    |> put_equipment_ids(attrs)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  defp put_muscle_ids(changeset, %{"muscle_ids" => muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id ->
        %{muscle_id: muscle_id, role: :primary}
      end)

    put_assoc(changeset, :exercise_muscles, exercise_muscles)
  end

  defp put_muscle_ids(changeset, %{muscle_ids: muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id ->
        %{muscle_id: muscle_id, role: :primary}
      end)

    put_assoc(changeset, :exercise_muscles, exercise_muscles)
  end

  defp put_muscle_ids(changeset, _), do: changeset

  defp put_equipment_ids(changeset, %{"equipment_ids" => equipment_ids})
       when is_list(equipment_ids) do
    exercise_equipment =
      Enum.map(equipment_ids, fn equipment_id ->
        %{equipment_id: equipment_id}
      end)

    put_assoc(changeset, :exercise_equipment, exercise_equipment)
  end

  defp put_equipment_ids(changeset, %{equipment_ids: equipment_ids})
       when is_list(equipment_ids) do
    exercise_equipment =
      Enum.map(equipment_ids, fn equipment_id ->
        %{equipment_id: equipment_id}
      end)

    put_assoc(changeset, :exercise_equipment, exercise_equipment)
  end

  defp put_equipment_ids(changeset, _), do: changeset
end
