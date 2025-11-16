defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    field :quantity, :decimal
    field :serving_unit, :string

    belongs_to :recipe, Easy.Nutrition.Recipe, on_replace: :delete
    belongs_to :ingredient, Easy.Nutrition.Ingredient

    timestamps()
  end

  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:quantity, :serving_unit, :recipe_id, :ingredient_id])
    |> validate_required([:quantity, :serving_unit, :recipe_id, :ingredient_id])
  end
end
