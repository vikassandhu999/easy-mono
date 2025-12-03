defmodule Easy.Nutrition.Calculator do
  @moduledoc """
  Provides server-side calculation of nutritional macros for recipes.

  This module ensures data integrity by calculating macro totals from
  recipe ingredients rather than trusting client-provided values.

  ## Unit Conversion Strategy

  1. If `RecipeIngredient` has a `unit_id`, look up the corresponding
     `ServingSize` for that ingredient+unit combination.
  2. Use `ServingSize.gram_weight` to convert quantity to grams.
  3. If no `ServingSize` exists, fall back to treating the quantity as grams.
  4. Calculate macros based on the ingredient's per-100g values.
  """

  alias Easy.Repo
  alias Easy.Nutrition.{Recipe, RecipeIngredient, Ingredient, ServingSize}

  import Ecto.Query

  @doc """
  Calculates the total macros for a recipe based on its ingredients.

  Returns a map with:
  - `:total_calories`
  - `:total_protein`
  - `:total_carbohydrates`
  - `:total_fats`
  - `:total_fiber`

  All values are `Decimal` for precision.

  ## Examples

      iex> Calculator.calculate_recipe_macros(recipe_with_preloaded_ingredients)
      %{
        total_calories: Decimal.new("450.5"),
        total_protein: Decimal.new("25.0"),
        total_carbohydrates: Decimal.new("35.0"),
        total_fats: Decimal.new("20.0"),
        total_fiber: Decimal.new("5.0")
      }
  """
  @spec calculate_recipe_macros(Recipe.t()) :: map()
  def calculate_recipe_macros(%Recipe{} = recipe) do
    recipe = ensure_ingredients_preloaded(recipe)

    recipe.recipe_ingredients
    |> Enum.reduce(empty_macros(), fn recipe_ingredient, acc ->
      ingredient_macros = calculate_ingredient_macros(recipe_ingredient)
      sum_macros(acc, ingredient_macros)
    end)
  end

  @doc """
  Calculates macros for a single recipe ingredient.

  Converts the quantity to grams using serving size data when available,
  then calculates macros based on the ingredient's per-100g values.
  """
  @spec calculate_ingredient_macros(RecipeIngredient.t()) :: map()
  def calculate_ingredient_macros(%RecipeIngredient{} = recipe_ingredient) do
    recipe_ingredient = ensure_ingredient_preloaded(recipe_ingredient)

    case recipe_ingredient.ingredient do
      nil ->
        empty_macros()

      ingredient ->
        grams = quantity_to_grams(recipe_ingredient, ingredient)
        calculate_macros_from_grams(ingredient, grams)
    end
  end

  @doc """
  Converts a recipe ingredient's quantity to grams.

  Uses the following logic:
  1. If quantity is nil, returns 0
  2. Looks up ServingSize for the ingredient+unit combination
  3. If found, multiplies quantity by gram_weight
  4. If not found, assumes quantity is already in grams
  """
  @spec quantity_to_grams(RecipeIngredient.t(), Ingredient.t()) :: Decimal.t()
  def quantity_to_grams(%RecipeIngredient{quantity: nil}, _ingredient) do
    Decimal.new(0)
  end

  def quantity_to_grams(%RecipeIngredient{} = recipe_ingredient, %Ingredient{} = ingredient) do
    quantity = recipe_ingredient.quantity || Decimal.new(0)

    case recipe_ingredient.unit_id do
      nil ->
        # No unit specified, assume grams
        quantity

      unit_id ->
        # Look up serving size for this ingredient+unit combination
        case get_serving_size(ingredient.id, unit_id) do
          nil ->
            # No serving size defined, fall back to grams
            quantity

          %ServingSize{gram_weight: gram_weight} ->
            Decimal.mult(quantity, gram_weight)
        end
    end
  end

  @doc """
  Updates a recipe struct with calculated macro totals.

  Does not persist to database - use this to prepare a recipe
  before insert/update, or use `recalculate_and_update_recipe/1`
  to persist changes.
  """
  @spec apply_calculated_macros(Recipe.t()) :: Recipe.t()
  def apply_calculated_macros(%Recipe{} = recipe) do
    macros = calculate_recipe_macros(recipe)

    %{
      recipe
      | total_calories: macros.total_calories,
        total_protein: macros.total_protein,
        total_carbohydrates: macros.total_carbohydrates,
        total_fats: macros.total_fats,
        total_fiber: macros.total_fiber
    }
  end

  @doc """
  Recalculates and persists macro totals for a recipe.

  Use this after modifying recipe ingredients to ensure
  stored totals are accurate.
  """
  @spec recalculate_and_update_recipe(Recipe.t()) ::
          {:ok, Recipe.t()} | {:error, Ecto.Changeset.t()}
  def recalculate_and_update_recipe(%Recipe{} = recipe) do
    macros = calculate_recipe_macros(recipe)

    recipe
    |> Ecto.Changeset.change(macros)
    |> Repo.update()
  end

  # Private functions

  defp empty_macros do
    %{
      total_calories: Decimal.new(0),
      total_protein: Decimal.new(0),
      total_carbohydrates: Decimal.new(0),
      total_fats: Decimal.new(0),
      total_fiber: Decimal.new(0)
    }
  end

  defp sum_macros(acc, macros) do
    %{
      total_calories: Decimal.add(acc.total_calories, macros.total_calories),
      total_protein: Decimal.add(acc.total_protein, macros.total_protein),
      total_carbohydrates: Decimal.add(acc.total_carbohydrates, macros.total_carbohydrates),
      total_fats: Decimal.add(acc.total_fats, macros.total_fats),
      total_fiber: Decimal.add(acc.total_fiber, macros.total_fiber)
    }
  end

  defp calculate_macros_from_grams(%Ingredient{} = ingredient, grams) do
    # Macros are stored per 100g, so we divide grams by 100
    factor = Decimal.div(grams, Decimal.new(100))

    %{
      total_calories: multiply_or_zero(ingredient.calories_per_100g, factor),
      total_protein: multiply_or_zero(ingredient.protein_per_100g, factor),
      total_carbohydrates: multiply_or_zero(ingredient.carbohydrates_per_100g, factor),
      total_fats: multiply_or_zero(ingredient.fats_per_100g, factor),
      total_fiber: multiply_or_zero(ingredient.fiber_per_100g, factor)
    }
  end

  defp multiply_or_zero(nil, _factor), do: Decimal.new(0)

  defp multiply_or_zero(value, factor) do
    Decimal.mult(value, factor) |> Decimal.round(2)
  end

  defp get_serving_size(ingredient_id, unit_id) do
    Repo.one(
      from ss in ServingSize,
        where: ss.ingredient_id == ^ingredient_id and ss.unit_id == ^unit_id
    )
  end

  defp ensure_ingredients_preloaded(%Recipe{recipe_ingredients: ingredients} = recipe)
       when is_list(ingredients) do
    # Check if ingredients are already loaded
    if Enum.all?(ingredients, &Ecto.assoc_loaded?(&1.ingredient)) do
      recipe
    else
      Repo.preload(recipe, recipe_ingredients: :ingredient)
    end
  end

  defp ensure_ingredients_preloaded(%Recipe{} = recipe) do
    Repo.preload(recipe, recipe_ingredients: :ingredient)
  end

  defp ensure_ingredient_preloaded(%RecipeIngredient{ingredient: %Ingredient{}} = ri), do: ri

  defp ensure_ingredient_preloaded(%RecipeIngredient{} = ri) do
    Repo.preload(ri, :ingredient)
  end
end
