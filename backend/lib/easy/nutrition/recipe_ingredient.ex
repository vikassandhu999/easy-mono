defmodule Easy.Nutrition.RecipeIngredient do
  @moduledoc """
  RecipeIngredient schema representing the join table between recipes and ingredients.

  This schema stores the quantity and unit of measurement for each ingredient
  used in a recipe, along with optional preparation notes.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    field :quantity, :decimal
    field :unit, :string
    field :notes, :string

    belongs_to :recipe, Easy.Nutrition.Recipe
    belongs_to :ingredient, Easy.Nutrition.Ingredient

    timestamps()
  end

  @valid_units ~w(g kg ml l cup tbsp tsp oz lb)

  @doc """
  Changeset for creating a new recipe ingredient association.
  Requires recipe_id, ingredient_id, quantity, and unit.
  """
  def create_changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:recipe_id, :ingredient_id, :quantity, :unit, :notes])
    |> validate_required([:recipe_id, :ingredient_id, :quantity, :unit])
    |> validate_quantity()
    |> validate_unit()
    |> foreign_key_constraint(:recipe_id)
    |> foreign_key_constraint(:ingredient_id)
    |> unique_constraint([:recipe_id, :ingredient_id],
      name: :recipe_ingredients_recipe_id_ingredient_id_index,
      message: "ingredient already added to this recipe"
    )
  end

  @doc """
  Changeset for updating a recipe ingredient association.
  Allows updating quantity, unit, and notes.
  """
  def update_changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:quantity, :unit, :notes])
    |> validate_quantity()
    |> validate_unit()
  end

  # Private validation helpers

  defp validate_quantity(changeset) do
    case get_change(changeset, :quantity) do
      nil ->
        changeset

      value ->
        if Decimal.compare(value, Decimal.new(0)) == :gt do
          changeset
        else
          add_error(changeset, :quantity, "must be positive")
        end
    end
  end

  defp validate_unit(changeset) do
    changeset
    |> validate_inclusion(:unit, @valid_units,
      message: "must be one of: #{Enum.join(@valid_units, ", ")}"
    )
  end
end
