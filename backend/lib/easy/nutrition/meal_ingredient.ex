defmodule Easy.Nutrition.MealIngredient do
  @moduledoc """
  MealIngredient schema representing the join table between meals and ingredients.

  This schema stores the quantity and unit of measurement for each ingredient
  added directly to a meal (not through a recipe), along with optional notes.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_ingredients" do
    field :quantity, :decimal
    field :unit, :string
    field :notes, :string

    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :ingredient, Easy.Nutrition.Ingredient

    timestamps()
  end

  @valid_units ~w(g kg ml l cup tbsp tsp oz lb)

  @doc """
  Changeset for creating a new meal ingredient association.
  Requires meal_id, ingredient_id, quantity, and unit.
  """
  def create_changeset(meal_ingredient, attrs) do
    meal_ingredient
    |> cast(attrs, [:meal_id, :ingredient_id, :quantity, :unit, :notes])
    |> validate_required([:meal_id, :ingredient_id, :quantity, :unit])
    |> validate_quantity()
    |> validate_unit()
    |> foreign_key_constraint(:meal_id)
    |> foreign_key_constraint(:ingredient_id)
  end

  @doc """
  Changeset for updating a meal ingredient association.
  Allows updating quantity, unit, and notes.
  """
  def update_changeset(meal_ingredient, attrs) do
    meal_ingredient
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
