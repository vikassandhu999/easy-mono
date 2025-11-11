defmodule Easy.Nutrition.MealRecipe do
  @moduledoc """
  MealRecipe schema representing the join table between meals and recipes.

  ## Overview

  This schema manages the many-to-many relationship between meals and recipes.
  Each meal can contain multiple recipes, and each recipe can be used in multiple meals.

  ## Serving Multiplier

  The `servings` field indicates how many servings of the recipe are included in
  the meal. This allows for flexible portioning:
  - `1.0` - One full serving of the recipe
  - `2.0` - Two servings of the recipe
  - `0.5` - Half a serving of the recipe
  - `1.5` - One and a half servings

  ## Recipe Ingredients

  When a recipe is added to a meal, the recipe's embedded ingredients are
  automatically included. The ingredients are stored in the recipe itself as
  a text array, not in this join table.

  Example:
  ```elixir
  # A meal with two recipes
  %Meal{
    name: "Lunch",
    meal_recipes: [
      %MealRecipe{
        recipe: %Recipe{
          name: "Grilled Chicken",
          ingredients: ["Chicken Breast", "Olive Oil", "Garlic"]
        },
        servings: Decimal.new("1.0")
      },
      %MealRecipe{
        recipe: %Recipe{
          name: "Brown Rice",
          ingredients: ["Brown Rice", "Water", "Salt"]
        },
        servings: Decimal.new("1.5")
      }
    ]
  }
  ```

  ## Notes

  Optional notes can be added to each meal-recipe association to provide
  context-specific information, such as preparation variations or substitutions
  for this particular meal.
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

  ## Required Fields
  - meal_id: UUID of the meal
  - recipe_id: UUID of the recipe
  - servings: Serving multiplier (positive decimal)

  ## Optional Fields
  - notes: Additional notes for this meal-recipe association

  ## Validations
  - Servings must be a positive decimal
  - Prevents duplicate recipes in the same meal

  ## Examples

      # Add a recipe to a meal with 1 serving
      iex> create_changeset(%MealRecipe{}, %{
      ...>   meal_id: meal_id,
      ...>   recipe_id: recipe_id,
      ...>   servings: Decimal.new("1.0")
      ...> })
      %Ecto.Changeset{valid?: true}

      # Add a recipe with 1.5 servings and notes
      iex> create_changeset(%MealRecipe{}, %{
      ...>   meal_id: meal_id,
      ...>   recipe_id: recipe_id,
      ...>   servings: Decimal.new("1.5"),
      ...>   notes: "Extra portion for post-workout"
      ...> })
      %Ecto.Changeset{valid?: true}

      # Invalid: negative servings
      iex> create_changeset(%MealRecipe{}, %{
      ...>   meal_id: meal_id,
      ...>   recipe_id: recipe_id,
      ...>   servings: Decimal.new("-1")
      ...> })
      %Ecto.Changeset{valid?: false, errors: [servings: {"must be positive", []}]}

      # Invalid: duplicate recipe in same meal
      iex> create_changeset(%MealRecipe{}, %{
      ...>   meal_id: meal_id,
      ...>   recipe_id: already_added_recipe_id,
      ...>   servings: Decimal.new("1.0")
      ...> })
      %Ecto.Changeset{valid?: false, errors: [recipe_id: {"recipe already added to this meal", []}]}
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

  Allows updating the serving multiplier and notes for an existing meal-recipe
  association. The meal_id and recipe_id cannot be changed.

  ## Updatable Fields
  - servings: Serving multiplier (positive decimal)
  - notes: Additional notes

  ## Examples

      # Update servings to 2.0
      iex> update_changeset(meal_recipe, %{servings: Decimal.new("2.0")})
      %Ecto.Changeset{valid?: true}

      # Update notes
      iex> update_changeset(meal_recipe, %{notes: "Double portion"})
      %Ecto.Changeset{valid?: true}

      # Invalid: zero servings
      iex> update_changeset(meal_recipe, %{servings: Decimal.new("0")})
      %Ecto.Changeset{valid?: false, errors: [servings: {"must be positive", []}]}
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
