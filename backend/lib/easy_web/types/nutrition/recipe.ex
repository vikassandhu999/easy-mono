defmodule EasyWeb.Types.Nutrition.RecipeIngredient do
  use EasyWeb.Type
  @type t :: %{required(:food_id) => Ecto.UUID.t(), required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t()}
end

defmodule EasyWeb.Types.Nutrition.Recipe do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:allergens) => [String.t()],
          required(:dietary_tags) => [String.t()],
          required(:tags) => [String.t()],
          required(:description) => String.t() | nil,
          required(:instructions) => String.t() | nil,
          required(:servings_count) => pos_integer(),
          required(:cooked_weight_g) => number() | nil,
          required(:ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredient.t()],
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          required(:grams) => number(),
          required(:revision) => pos_integer(),
          required(:archived_at) => DateTime.t() | nil,
          required(:creator_id) => String.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:tags) => [String.t()],
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:servings_count) => pos_integer(),
          optional(:cooked_weight_g) => number() | nil,
          optional(:ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredient.t()]
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:tags) => [String.t()],
          optional(:description) => String.t() | nil,
          optional(:instructions) => String.t() | nil,
          optional(:servings_count) => pos_integer(),
          optional(:cooked_weight_g) => number() | nil,
          optional(:ingredients) => [EasyWeb.Types.Nutrition.RecipeIngredient.t()]
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:categories) => [String.t()]
        }
  @type client_list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t()
        }
  @type category_list :: %{required(:data) => [String.t()]}
  @type impact :: %{
          required(:data) => %{
            required(:recipes) => [EasyWeb.Types.Nutrition.FoodRecipeRef.t()],
            required(:templates) => [EasyWeb.Types.Nutrition.FoodPlanRef.t()],
            required(:client_plans) => [EasyWeb.Types.Nutrition.FoodPlanRef.t()]
          }
        }
  @spec format(Easy.Nutrition.Recipe.t()) :: t()
  def format(row) do
    row
    |> Map.take([
      :id,
      :name,
      :allergens,
      :dietary_tags,
      :tags,
      :description,
      :instructions,
      :servings_count,
      :cooked_weight_g,
      :ingredients,
      :nutrients,
      :grams,
      :revision,
      :archived_at,
      :creator_id,
      :inserted_at,
      :updated_at
    ])
  end
end

defmodule EasyWeb.Types.Nutrition.RecipeIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Nutrition.Recipe.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
