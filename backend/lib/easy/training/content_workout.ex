defmodule Easy.Training.Content.Workout do
  use Ecto.Schema
  alias Easy.Training.Content.Block
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :id, Ecto.UUID
    field :name, :string
    field :notes, :string
    embeds_many :blocks, Block, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:id, :name, :notes])
    |> cast_embed(:blocks, with: &Block.changeset/2)
    |> validate_required([:id, :name])
  end
end
