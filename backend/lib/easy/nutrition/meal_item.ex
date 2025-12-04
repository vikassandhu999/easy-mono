defmodule Easy.Nutrition.MealItem do
  use Easy.Nutrition.Schema

  alias Easy.Nutrition.{Recipe, Meal}

  schema "meal_items" do
    field :position, :integer, default: 0

    field :servings, :decimal

    belongs_to :recipe, Recipe
    belongs_to :meal, Meal

    timestamps()
  end

  def changeset(item, attrs) do
    item
    |> cast(attrs, [:position, :servings, :recipe_id])
    |> validate_required([:recipe_id, :servings, :meal_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:meal_id)
    |> foreign_key_constraint(:recipe_id)
    # Ensure recipe is unique per meal to prevent accidental duplication
    |> unique_constraint([:meal_id, :recipe_id], name: :meal_recipe_unique_idx)
  end
end
