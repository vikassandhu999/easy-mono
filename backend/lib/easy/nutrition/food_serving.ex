defmodule Easy.Nutrition.FoodServing do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Utils
  @primary_key false
  embedded_schema do
    field :label, :string
    field :amount, :float
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:label, :amount])
      |> update_change(:label, &Utils.trim/1)
      |> validate_required([:label, :amount])
      |> validate_number(:amount, greater_than: 0)
end
