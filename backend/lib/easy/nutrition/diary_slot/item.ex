defmodule Easy.Nutrition.DiarySlot.Item do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.{NutrientTotals, Portion}

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :portion, Portion
    field :nutrients, NutrientTotals
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(item, attrs) do
    item |> cast(attrs, [:id, :name, :food_id, :recipe_id, :portion, :nutrients]) |> validate_snapshot()
  end

  @spec validate_snapshot(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_snapshot(changeset) do
    changeset = validate_required(changeset, [:id, :name, :portion, :nutrients])

    case {get_field(changeset, :food_id), get_field(changeset, :recipe_id)} do
      {id, nil} when is_binary(id) -> changeset
      {nil, id} when is_binary(id) -> changeset
      _ -> add_error(changeset, :food_id, "must supply exactly one Library reference")
    end
  end
end
