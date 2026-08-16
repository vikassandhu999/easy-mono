defmodule Easy.Nutrition.ServingSize do
  use Ecto.Schema

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key false
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
    |> cast(attrs, [:label, :amount, :unit, :weight_g, :is_default])
    |> validate_required([:label, :amount, :unit, :weight_g])
    |> validate_number(:amount, greater_than: 0)
    |> validate_number(:weight_g, greater_than: 0)
  end
end
