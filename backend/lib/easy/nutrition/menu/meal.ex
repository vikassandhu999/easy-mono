defmodule Easy.Nutrition.Menu.Meal do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Menu.Item

  @type t() :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  embedded_schema do
    field :name, :string
    field :notes, :string
    embeds_many :meal_items, Item
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(meal, attrs) do
    meal
    |> cast(attrs, [:id, :name, :notes])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:id, :name])
    |> validate_length(:name, max: 255)
    |> validate_length(:notes, max: 5000)
    |> cast_embed(:meal_items)
  end
end
