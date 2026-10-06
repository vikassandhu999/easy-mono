defmodule Easy.Training.Content.Block do
  use Ecto.Schema
  alias Easy.Training.Content.Item
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :id, Ecto.UUID
    field :format, Ecto.Enum, values: [:straight, :superset, :circuit]
    field :rounds, :integer
    field :rest_s, :integer
    field :notes, :string
    embeds_many :items, Item, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:id, :format, :rounds, :rest_s, :notes])
    |> cast_embed(:items, with: &Item.changeset/2)
    |> validate_required([:id, :format])
    |> validate_number(:rest_s, greater_than_or_equal_to: 0)
    |> validate_number(:rounds, greater_than_or_equal_to: 0)
  end
end
