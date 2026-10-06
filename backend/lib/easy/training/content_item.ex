defmodule Easy.Training.Content.Item do
  use Ecto.Schema
  alias Easy.Training.Content.Set
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :id, Ecto.UUID
    field :exercise_id, Ecto.UUID
    field :exercise_name, :string
    field :notes, :string
    embeds_many :sets, Set, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:id, :exercise_id, :exercise_name, :notes])
    |> cast_embed(:sets, with: &Set.changeset/2)
    |> validate_required([:id, :exercise_id])
  end
end
