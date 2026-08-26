defmodule EasyWeb.Types.Nutrition.RecipeIngredientInput do
  use EasyWeb.Type

  @type t :: %{
          required(:food_id) => String.t(),
          optional(:unit) => String.t() | nil,
          optional(:amount) => number() | nil,
          required(:weight_g) => number()
        }
end

defmodule EasyWeb.Types.Nutrition.RecipeIngredient do
  use EasyWeb.Type

  @type t :: %{
          required(:food_id) => String.t(),
          required(:food) => EasyWeb.Types.Nutrition.Food.t() | nil,
          required(:unit) => String.t() | nil,
          required(:amount) => float() | nil,
          required(:weight_g) => float(),
          required(:position) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.Nutrition.RecipePlanRef do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:client_id) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.Recipe do
  use EasyWeb.Type

  alias Easy.Nutrition.NutrientTotals
  alias Easy.Nutrition.Recipe, as: RecipeSchema
  alias Easy.Nutrition.RecipeIngredient, as: RecipeIngredientSchema

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:instructions) => String.t() | nil,
          required(:servings_count) => pos_integer(),
          required(:cooked_weight_g) => float() | nil,
          required(:revision) => pos_integer(),
          required(:allergens) => [String.t()],
          required(:dietary_tags) => [String.t()],
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:recipe_ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredient.t()],
          required(:creator_id) => String.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          required(:servings_count) => pos_integer(),
          optional(:cooked_weight_g) => number() | nil,
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:recipe_ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredientInput.t()]
        }

  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:servings_count) => pos_integer(),
          optional(:cooked_weight_g) => number() | nil,
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:recipe_ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredientInput.t()]
        }

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t()
        }

  @type impact :: %{
          required(:data) => %{
            required(:templates) => [EasyWeb.Types.Nutrition.RecipePlanRef.t()],
            required(:active_client_plans) => [EasyWeb.Types.Nutrition.RecipePlanRef.t()]
          }
        }

  @spec format(RecipeSchema.t()) :: t()
  def format(%RecipeSchema{} = recipe) do
    %{
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      servings_count: recipe.servings_count,
      cooked_weight_g: recipe.cooked_weight_g,
      revision: recipe.revision,
      allergens: recipe.allergens || [],
      dietary_tags: recipe.dietary_tags || [],
      nutrients: recipe |> NutrientTotals.from_recipe() |> NutrientTotals.round(),
      recipe_ingredients: Enum.map(recipe.recipe_ingredients, &ingredient_data/1),
      creator_id: recipe.creator_id,
      inserted_at: recipe.inserted_at,
      updated_at: recipe.updated_at
    }
  end

  defp ingredient_data(%RecipeIngredientSchema{} = ingredient) do
    %{
      food_id: ingredient.food_id,
      food: ingredient.food,
      unit: ingredient.unit,
      amount: ingredient.amount,
      weight_g: ingredient.weight_g,
      position: ingredient.position
    }
  end
end
