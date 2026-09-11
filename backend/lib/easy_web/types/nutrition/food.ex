defmodule EasyWeb.Types.Nutrition.FoodServingSize do
  use EasyWeb.Type

  @type t :: %{
          required(:label) => String.t(),
          required(:amount) => number(),
          required(:unit) => String.t(),
          required(:weight_g) => number(),
          required(:is_default) => boolean()
        }
end

defmodule EasyWeb.Types.Nutrition.FoodNutrients do
  use EasyWeb.Type

  @type t :: %{
          required(:calories) => float() | nil,
          required(:protein) => float() | nil,
          required(:carbohydrates) => float() | nil,
          required(:fat) => float() | nil,
          required(:fiber) => float() | nil,
          required(:complete) => boolean()
        }
end

defmodule EasyWeb.Types.Nutrition.FoodMedia do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :image | :video,
          required(:content_type) => String.t() | nil,
          required(:byte_size) => integer() | nil,
          required(:url) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.FoodRecipeRef do
  use EasyWeb.Type

  @type t :: %{required(:id) => String.t(), required(:name) => String.t()}
end

defmodule EasyWeb.Types.Nutrition.FoodPlanRef do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:client_id) => String.t() | nil
        }
end

defmodule EasyWeb.Types.Nutrition.Food do
  use EasyWeb.Type

  alias Easy.LibraryMedia
  alias Easy.LibraryMedia.Media
  alias Easy.Nutrition.Food, as: FoodSchema
  alias Easy.Nutrition.NutrientTotals
  alias Easy.Nutrition.Portions

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:brand) => String.t() | nil,
          required(:source) => :system | :custom,
          required(:category) => String.t() | nil,
          required(:default_portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          required(:portion_options) => [EasyWeb.Types.Nutrition.NutritionPortion.t()],
          required(:revision) => pos_integer(),
          required(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:calories_per_100g) => float() | nil,
          required(:protein_g_per_100g) => float() | nil,
          required(:carbs_g_per_100g) => float() | nil,
          required(:fat_g_per_100g) => float() | nil,
          required(:fiber_g_per_100g) => float() | nil,
          required(:sugar_g_per_100g) => float() | nil,
          required(:allergens) => [String.t()],
          required(:dietary_tags) => [String.t()],
          required(:notes) => String.t() | nil,
          required(:media) => EasyWeb.Types.Nutrition.FoodMedia.t() | nil,
          required(:serving_sizes) => [EasyWeb.Types.Nutrition.FoodServingSize.t()],
          required(:creator_id) => String.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:brand) => String.t() | nil,
          optional(:category) => String.t() | nil,
          optional(:calories_per_100g) => number() | nil,
          optional(:protein_g_per_100g) => number() | nil,
          optional(:carbs_g_per_100g) => number() | nil,
          optional(:fat_g_per_100g) => number() | nil,
          optional(:fiber_g_per_100g) => number() | nil,
          optional(:sugar_g_per_100g) => number() | nil,
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:notes) => String.t() | nil,
          optional(:media_id) => String.t() | nil,
          optional(:serving_sizes) => [EasyWeb.Types.Nutrition.FoodServingSize.t()]
        }

  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:brand) => String.t() | nil,
          optional(:category) => String.t() | nil,
          optional(:calories_per_100g) => number() | nil,
          optional(:protein_g_per_100g) => number() | nil,
          optional(:carbs_g_per_100g) => number() | nil,
          optional(:fat_g_per_100g) => number() | nil,
          optional(:fiber_g_per_100g) => number() | nil,
          optional(:sugar_g_per_100g) => number() | nil,
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:notes) => String.t() | nil,
          optional(:media_id) => String.t() | nil,
          optional(:serving_sizes) => [EasyWeb.Types.Nutrition.FoodServingSize.t()]
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:categories) => [String.t()]
        }

  @type client_list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t()
        }

  @type impact :: %{
          required(:data) => %{
            required(:recipes) => [EasyWeb.Types.Nutrition.FoodRecipeRef.t()],
            required(:templates) => [EasyWeb.Types.Nutrition.FoodPlanRef.t()],
            required(:client_plans) => [EasyWeb.Types.Nutrition.FoodPlanRef.t()]
          }
        }

  @type category_list :: %{required(:data) => [String.t()]}

  @spec format(FoodSchema.t()) :: t()
  def format(%FoodSchema{} = food) do
    portions = Portions.for_food(food)
    nutrients = food |> NutrientTotals.from_food() |> NutrientTotals.round()

    %{
      id: food.id,
      name: food.name,
      brand: food.brand,
      source: food.source,
      category: food.category,
      revision: food.revision,
      default_portion: portions.default_portion,
      portion_options: portions.portion_options,
      nutrients: nutrients,
      calories_per_100g: nutrients.calories,
      protein_g_per_100g: nutrients.protein,
      carbs_g_per_100g: nutrients.carbohydrates,
      fat_g_per_100g: nutrients.fat,
      fiber_g_per_100g: nutrients.fiber,
      sugar_g_per_100g: food.sugar_g_per_100g,
      allergens: food.allergens || [],
      dietary_tags: food.dietary_tags || [],
      notes: food.notes,
      media: media_data(food.media),
      serving_sizes: serving_sizes(food.serving_sizes),
      creator_id: food.creator_id,
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp media_data(nil), do: nil
  defp media_data(%Media{} = media), do: LibraryMedia.public_representation(media)

  defp serving_sizes(nil), do: []

  defp serving_sizes(serving_sizes) when is_list(serving_sizes) do
    Enum.map(serving_sizes, fn serving_size ->
      %{
        label: serving_size.label,
        amount: serving_size.amount,
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        is_default: serving_size.is_default
      }
    end)
  end
end

defmodule EasyWeb.Types.Nutrition.FoodIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Nutrition.Food.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
