defmodule Easy.Nutrition.Menu.Item do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.{NutrientTotals, Portion}

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :name, :string, virtual: true
    field :portion, Portion
    field :nutrients, NutrientTotals, virtual: true
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(item, attrs) do
    item
    |> cast(attrs, [:id, :food_id, :recipe_id, :portion])
    |> validate_required([:id, :portion])
    |> validate_source()
  end

  defp validate_source(changeset) do
    case {get_field(changeset, :food_id), get_field(changeset, :recipe_id)} do
      {id, nil} when is_binary(id) -> changeset
      {nil, id} when is_binary(id) -> changeset
      _other -> add_error(changeset, :food_id, "must supply exactly one Library reference")
    end
  end
end
