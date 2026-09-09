defmodule Easy.Nutrition.Menu.Slot do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.MealSlot

  @type t() :: %__MODULE__{}
  @primary_key false
  embedded_schema do
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :meal_ids, {:array, Ecto.UUID}
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(slot, attrs) do
    slot
    |> cast(attrs, [:meal_slot, :meal_ids])
    |> validate_required([:meal_slot, :meal_ids])
    |> validate_length(:meal_ids, min: 1)
  end
end
