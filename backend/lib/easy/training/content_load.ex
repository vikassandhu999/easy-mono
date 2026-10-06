defmodule Easy.Training.Content.Load do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :kg, :float
    field :entered_unit, Ecto.Enum, values: [:kg, :lb]
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:kg, :entered_unit])
    |> validate_required([:kg, :entered_unit])
  end
end
