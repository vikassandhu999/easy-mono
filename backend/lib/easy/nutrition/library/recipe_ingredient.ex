defmodule Easy.Nutrition.Library.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition.Library

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string

    belongs_to :recipe, Library.Recipe
    belongs_to :food, Library.Food

    timestamps(type: :utc_datetime)
  end
end
