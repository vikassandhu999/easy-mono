defmodule Easy.Training.Library.Exercise do
  use Easy.Training.Schema

  alias Easy.Training.Library.{Muscle, Equipment}
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

    many_to_many :muscles, Muscle,
      join_through: "exercise_muscles",
      on_replace: :delete

    many_to_many :equipment, Equipment,
      join_through: "exercise_equipment",
      on_replace: :delete

    timestamps()
  end

  @doc false
  def changeset(exercise, attrs) do
    exercise
    |> cast(attrs, [:name, :description, :instructions, :slug, :mechanics, :force, :business_id])
    |> validate_required([:name, :mechanics, :force])
    |> generate_slug()
    |> unique_constraint([:name, :business_id], name: :exercises_name_business_id_index)
    |> foreign_key_constraint(:business_id)
  end

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
