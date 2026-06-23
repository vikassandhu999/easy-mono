defmodule Easy.Nutrition.ServingSize do
  use Ecto.Schema

  @type t() :: %__MODULE__{}

  embedded_schema do
    field :label, :string
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :is_default, :boolean, default: false
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(serving_size, attrs) do
    serving_size
    |> Ecto.Changeset.cast(attrs, [:label, :amount, :unit, :weight_g, :is_default])
    |> Ecto.Changeset.validate_required([:unit, :weight_g])
  end
end
