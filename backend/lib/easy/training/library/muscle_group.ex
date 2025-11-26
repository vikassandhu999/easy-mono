defmodule Easy.Training.Library.MuscleGroup do
  use Easy.Training.Schema

  schema "muscle_groups" do
    field :name, :string
    field :description, :string

    has_many :muscles, Easy.Training.Library.Muscle

    timestamps()
  end

  @doc false
  def changeset(muscle_group, attrs) do
    muscle_group
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
    |> unique_constraint(:name)
  end
end
