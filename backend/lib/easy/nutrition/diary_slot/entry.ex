defmodule Easy.Nutrition.DiarySlot.Entry do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.Item
  alias Easy.Nutrition.{NutrientTotals, Portion}

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :portion, Portion
    field :nutrients, NutrientTotals
    field :planned_item_ref, Ecto.UUID
    field :notes, :string
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:id, :name, :food_id, :recipe_id, :portion, :nutrients, :planned_item_ref, :notes])
    |> Item.validate_snapshot()
    |> validate_length(:notes, max: 255)
  end
end
