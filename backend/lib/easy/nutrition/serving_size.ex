defmodule Easy.Nutrition.ServingSize do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.Ingredient

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "serving_sizes" do
    # e.g., "cup", "tbsp", "slice", "g", "oz", "scoop"
    field :name, :string

    # The "magic number": the equivalent gram weight of ONE of this unit.
    # e.g., 1 "tbsp" (name) of peanut butter = 16 (gram_weight)
    # e.g., 1 "slice" (name) of bread = 28 (gram_weight)
    # e.g., 1 "g" (name) = 1 (gram_weight)
    field :gram_weight, :decimal

    belongs_to :ingredient, Ingredient

    timestamps()
  end

  def changeset(%__MODULE__{} = serving_size, attrs) do
    serving_size
    |> cast(attrs, [:name, :gram_weight])
    |> validate_required([:name, :gram_weight])
  end
end
