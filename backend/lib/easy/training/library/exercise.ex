defmodule Easy.Training.Library.Exercise do
  use Easy.Training.Schema
  import Ecto.Query, warn: false

  alias Easy.Organizations.Business

  schema "exercises" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :slug, :string
    field :mechanics, Ecto.Enum, values: [:compound, :isolation, :isometric]
    field :force, Ecto.Enum, values: [:push, :pull, :static]

    # Hybrid scope: null for system exercises, UUID for business-specific
    belongs_to :business, Business

    has_many :exercise_muscles, Easy.Training.Library.ExerciseMuscle, on_replace: :delete
    has_many :muscles, through: [:exercise_muscles, :muscle]

    has_many :exercise_equipment, Easy.Training.Library.ExerciseEquipment, on_replace: :delete
    has_many :equipment, through: [:exercise_equipment, :equipment]

    timestamps()
  end

  @doc false
  def changeset(exercise, attrs) do
    exercise
    |> cast(attrs, [:name, :description, :instructions, :slug, :mechanics, :force, :business_id])
    |> validate_required([:name])
    |> generate_slug()
    |> put_muscle_ids(attrs)
    |> put_equipment_ids(attrs)
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

  defp put_muscle_ids(changeset, %{"muscle_ids" => muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id ->
        %{muscle_id: muscle_id, role: "primary"}
      end)

    put_assoc(changeset, :exercise_muscles, exercise_muscles)
  end

  defp put_muscle_ids(changeset, %{muscle_ids: muscle_ids}) when is_list(muscle_ids) do
    exercise_muscles =
      Enum.map(muscle_ids, fn muscle_id ->
        %{muscle_id: muscle_id, role: "primary"}
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

  defp generate_slug(changeset) do
    case get_change(changeset, :name) do
      nil ->
        changeset

      name ->
        slug =
          name
          |> String.downcase()
          |> String.replace(~r/[^\w\s-]/, "")
          |> String.replace(~r/\s+/, "-")

        put_change(changeset, :slug, slug)
    end
  end
end
