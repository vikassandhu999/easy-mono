defmodule Easy.Nutrition.Library.ServingSize do
  use Ecto.Schema

  embedded_schema do
    field :unit, :string
    field :weight_g, :float
    field :amount, :float
  end

  def changeset(serving_size, attrs) do
    serving_size
    |> Ecto.Changeset.cast(attrs, [:unit, :weight_g, :amount])
    |> Ecto.Changeset.validate_required([:unit])
  end
end
