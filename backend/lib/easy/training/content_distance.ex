defmodule Easy.Training.Content.Distance do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :m, :float
    field :entered_unit, Ecto.Enum, values: [:m, :km, :mi]
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:m, :entered_unit])
    |> validate_required([:m, :entered_unit])
  end
end
