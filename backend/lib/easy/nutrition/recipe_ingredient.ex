defmodule Easy.Nutrition.RecipeIngredient do
  use Easy.Nutrition.Schema

  alias Easy.Nutrition.{Recipe, Ingredient, MeasurementUnit}

  schema "recipe_ingredients" do
    field :position, :integer
    field :quantity, :decimal

    field :quantity_as_text, :string

    belongs_to :recipe, Recipe
    belongs_to :ingredient, Ingredient

    belongs_to :unit, MeasurementUnit

    timestamps()
  end

  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [
      :position,
      :quantity,
      :quantity_as_text,
      :recipe_id,
      :ingredient_id,
      :unit_id
    ])
    |> validate_required([:position, :ingredient_id])
    |> validate_at_least_one([:quantity, :quantity_as_text])
    |> validate_number(:quantity, greater_than_or_equal_to: 0)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:recipe_id)
    |> foreign_key_constraint(:ingredient_id)
    |> foreign_key_constraint(:unit_id)
  end

  defp validate_at_least_one(changeset, fields) do
    if Enum.any?(fields, fn field -> get_field(changeset, field) end) do
      changeset
    else
      add_error(
        changeset,
        List.first(fields),
        "either quantity or quantity_as_text must be provided"
      )
    end
  end
end
