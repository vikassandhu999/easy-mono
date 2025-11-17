defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    field :order, :integer
    field :quantity, :decimal

    field :quantity_as_text, :string

    belongs_to :recipe, Easy.Nutrition.Recipe, on_replace: :delete, type: :binary_id
    belongs_to :ingredient, Easy.Nutrition.Ingredient, type: :binary_id

    belongs_to :unit, Easy.Nutrition.MeasurementUnit, type: :binary_id

    timestamps()
  end

  @doc """
  Changeset for RecipeIngredient.
  Used for casting and validating the quantity and units of an ingredient within a recipe.
  """
  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [
      :order,
      :quantity,
      :quantity_as_text,
      :recipe_id,
      :ingredient_id,
      :unit_id
    ])
    |> validate_required([:order, :ingredient_id])
    |> validate_at_least_one([:quantity, :quantity_as_text])
    |> validate_number(:quantity, greater_than_or_equal_to: 0)
    |> validate_number(:order, greater_than_or_equal_to: 0)
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
