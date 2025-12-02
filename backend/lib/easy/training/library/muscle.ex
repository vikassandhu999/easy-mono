defmodule Easy.Training.Library.Muscle do
  use Easy.Training.Schema

  alias Easy.Training.Library.{MuscleGroup, Exercise}

  schema "muscles" do
    field :name, :string
    field :description, :string

    belongs_to :muscle_group, MuscleGroup

    many_to_many :exercises, Exercise,
      join_through: "exercise_muscles",
      on_replace: :delete

    timestamps()
  end

  @doc false
  def changeset(muscle, attrs) do
    muscle
    |> cast(attrs, [:name, :description, :muscle_group_id])
    |> validate_required([:name])
    |> unique_constraint(:name)
    |> foreign_key_constraint(:muscle_group_id)
  end
end
