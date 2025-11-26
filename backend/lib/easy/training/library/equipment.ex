defmodule Easy.Training.Library.Equipment do
  use Easy.Training.Schema

  alias Easy.Training.Library.Exercise

  schema "equipment" do
    field :name, :string
    field :description, :string

    many_to_many :exercises, Exercise,
      join_through: "exercise_equipment",
      on_replace: :delete

    timestamps()
  end

  @doc false
  def changeset(equipment, attrs) do
    equipment
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
    |> unique_constraint(:name)
  end
end
