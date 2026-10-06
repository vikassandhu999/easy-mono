defmodule Easy.Training.Content.Entry do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :id, Ecto.UUID
    field :day, :integer
    field :ref, Ecto.UUID
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:id, :day, :ref])
    |> validate_required([:id, :day, :ref])
    |> validate_number(:day, greater_than_or_equal_to: 0, less_than_or_equal_to: 6)
  end
end
