defmodule Easy.Nutrition.MealRecipe do
  @moduledoc """
  MealRecipe schema representing the join table between meals and recipes.

  This schema stores the serving multiplier for each recipe used in a meal,
  along with optional notes. The servings field indicates how many servings
  of the recipe are included in the meal (e.g., 1.5 servings).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_recipes" do
    field :servings, :decimal
    field :notes, :string

    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :recipe, Easy.Nutrition.Recipe

    timestamps()
  end

  @doc """
  Changeset for creating a new meal recipe association.
  Requires meal_id, recipe_id, and servings.
  """
  def create_changeset(meal_recipe, attrs) do
    meal_recipe
    |> cast(attrs, [:meal_id, :recipe_id, :servings, :notes])
    |> validate_required([:meal_id, :recipe_id, :servings])
    |> validate_servings()
    |> foreign_key_constraint(:meal_id)
    |> foreign_key_constraint(:recipe_id)
    |> unique_constraint([:meal_id, :recipe_id],
      name: :meal_recipes_meal_id_recipe_id_index,
      message: "recipe already added to this meal"
    )
  end

  @doc """
  Changeset for updating a meal recipe association.
  Allows updating servings and notes.
  """
  def update_changeset(meal_recipe, attrs) do
    meal_recipe
    |> cast(attrs, [:servings, :notes])
    |> validate_servings()
  end

  # Private validation helpers

  defp validate_servings(changeset) do
    case get_change(changeset, :servings) do
      nil ->
        changeset

      value ->
        if Decimal.compare(value, Decimal.new(0)) == :gt do
          changeset
        else
          add_error(changeset, :servings, "must be positive")
        end
    end
  end
end
