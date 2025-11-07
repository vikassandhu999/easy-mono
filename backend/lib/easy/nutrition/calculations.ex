defmodule Easy.Nutrition.Calculations do
  @moduledoc """
  Nutritional calculations helper module.

  Provides functions for:
  - Converting various units to grams
  - Calculating ingredient nutrition based on quantity
  - Calculating recipe nutrition from ingredients
  - Aggregating nutritional values
  """

  @doc """
  Converts various units to grams for standardized calculations.

  Supported units:
  - g (grams) - 1:1
  - kg (kilograms) - 1000:1
  - ml (milliliters) - 1:1 (assumes water density)
  - l (liters) - 1000:1
  - cup - 240g
  - tbsp (tablespoon) - 15g
  - tsp (teaspoon) - 5g
  - oz (ounces) - 28.35g

  ## Examples

      iex> convert_to_grams(100, "g")
      #Decimal<100>

      iex> convert_to_grams(1, "kg")
      #Decimal<1000>

      iex> convert_to_grams(1, "cup")
      #Decimal<240>
  """
  def convert_to_grams(quantity, unit) when is_binary(unit) do
    quantity_decimal = ensure_decimal(quantity)

    conversion_factor =
      case String.downcase(unit) do
        "g" -> Decimal.new(1)
        "kg" -> Decimal.new(1000)
        "ml" -> Decimal.new(1)
        "l" -> Decimal.new(1000)
        "cup" -> Decimal.new(240)
        "tbsp" -> Decimal.new(15)
        "tsp" -> Decimal.new(5)
        "oz" -> Decimal.new("28.35")
        _ -> Decimal.new(1)
      end

    Decimal.mult(quantity_decimal, conversion_factor)
  end

  @doc """
  Calculates nutritional values for an ingredient based on quantity.

  Ingredient nutritional values are stored per 100g, so this function
  scales them proportionally based on the actual quantity in grams.

  ## Parameters

  - `ingredient` - An ingredient struct with nutritional values per 100g
  - `quantity_grams` - The quantity in grams (as Decimal or number)

  ## Returns

  A map with calculated nutritional values:
  - `:calories` - Total calories
  - `:protein` - Total protein in grams
  - `:carbohydrates` - Total carbohydrates in grams
  - `:fats` - Total fats in grams
  - `:fiber` - Total fiber in grams

  ## Examples

      iex> ingredient = %{calories: Decimal.new(100), protein: Decimal.new(10), ...}
      iex> calculate_ingredient_nutrition(ingredient, 200)
      %{
        calories: #Decimal<200>,
        protein: #Decimal<20>,
        ...
      }
  """
  def calculate_ingredient_nutrition(ingredient, quantity_grams) do
    quantity_decimal = ensure_decimal(quantity_grams)
    multiplier = Decimal.div(quantity_decimal, Decimal.new(100))

    %{
      calories: multiply_nutritional_value(ingredient.calories, multiplier),
      protein: multiply_nutritional_value(ingredient.protein, multiplier),
      carbohydrates: multiply_nutritional_value(ingredient.carbohydrates, multiplier),
      fats: multiply_nutritional_value(ingredient.fats, multiplier),
      fiber: multiply_nutritional_value(ingredient.fiber, multiplier)
    }
  end

  @doc """
  Calculates total nutritional values for a recipe from its ingredients.

  Takes a recipe with preloaded recipe_ingredients (which must have
  preloaded ingredients), converts quantities to grams, calculates
  nutrition for each ingredient, and sums them up.

  ## Parameters

  - `recipe` - A recipe struct with preloaded recipe_ingredients and their ingredients

  ## Returns

  A map with total nutritional values for the recipe.

  ## Examples

      iex> recipe = %Recipe{recipe_ingredients: [%RecipeIngredient{...}, ...]}
      iex> calculate_recipe_nutrition(recipe)
      %{
        calories: #Decimal<500>,
        protein: #Decimal<30>,
        ...
      }
  """
  def calculate_recipe_nutrition(recipe) do
    recipe.recipe_ingredients
    |> Enum.map(fn recipe_ingredient ->
      quantity_grams = convert_to_grams(recipe_ingredient.quantity, recipe_ingredient.unit)
      calculate_ingredient_nutrition(recipe_ingredient.ingredient, quantity_grams)
    end)
    |> sum_nutritional_values()
  end

  @doc """
  Sums a list of nutritional value maps.

  Takes a list of maps containing nutritional values and aggregates them
  into a single map with totals.

  ## Parameters

  - `nutrition_list` - A list of maps with nutritional values

  ## Returns

  A map with summed nutritional values.

  ## Examples

      iex> nutrition_list = [
      ...>   %{calories: Decimal.new(100), protein: Decimal.new(10), ...},
      ...>   %{calories: Decimal.new(200), protein: Decimal.new(20), ...}
      ...> ]
      iex> sum_nutritional_values(nutrition_list)
      %{
        calories: #Decimal<300>,
        protein: #Decimal<30>,
        ...
      }
  """
  def sum_nutritional_values(nutrition_list) when is_list(nutrition_list) do
    Enum.reduce(nutrition_list, initial_nutrition_map(), fn nutrition, acc ->
      %{
        calories: Decimal.add(acc.calories, nutrition.calories),
        protein: Decimal.add(acc.protein, nutrition.protein),
        carbohydrates: Decimal.add(acc.carbohydrates, nutrition.carbohydrates),
        fats: Decimal.add(acc.fats, nutrition.fats),
        fiber: Decimal.add(acc.fiber, nutrition.fiber)
      }
    end)
  end

  # Private helper functions

  defp ensure_decimal(%Decimal{} = value), do: value
  defp ensure_decimal(value) when is_integer(value), do: Decimal.new(value)
  defp ensure_decimal(value) when is_float(value), do: Decimal.from_float(value)
  defp ensure_decimal(value) when is_binary(value), do: Decimal.new(value)

  defp multiply_nutritional_value(nil, _multiplier), do: Decimal.new(0)

  defp multiply_nutritional_value(value, multiplier) do
    value
    |> ensure_decimal()
    |> Decimal.mult(multiplier)
  end

  defp initial_nutrition_map do
    %{
      calories: Decimal.new(0),
      protein: Decimal.new(0),
      carbohydrates: Decimal.new(0),
      fats: Decimal.new(0),
      fiber: Decimal.new(0)
    }
  end
end
