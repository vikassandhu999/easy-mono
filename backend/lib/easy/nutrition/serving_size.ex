defmodule Easy.Nutrition.ServingSize do
  use Ecto.Schema

  @type t() :: %__MODULE__{}

  embedded_schema do
    field :unit, :string
    field :weight_g, :float
    field :amount, :float
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(serving_size, attrs) do
    serving_size
    |> Ecto.Changeset.cast(attrs, [:unit, :weight_g, :amount])
    |> Ecto.Changeset.validate_required([:unit])
  end
end
