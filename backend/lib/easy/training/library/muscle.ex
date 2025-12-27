defmodule Easy.Training.Library.Muscle do
  use Easy.Training.Schema

  alias Easy.Training.Library.Exercise

  schema "muscles" do
    field :name, :string
    field :description, :string

    many_to_many :exercises, Exercise,
      join_through: "exercise_muscles",
      on_replace: :delete

    timestamps()
  end

  def changeset(muscle, attrs) do
    muscle
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
    |> unique_constraint(:name)
  end
end
