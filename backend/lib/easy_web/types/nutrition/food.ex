defmodule EasyWeb.Types.Nutrition.FoodServing do
  use EasyWeb.Type
  @type t :: %{required(:id) => String.t(), required(:label) => String.t(), required(:grams) => number()}
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

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:allergens) => [String.t()],
          required(:dietary_tags) => [String.t()],
          required(:tags) => [String.t()],
          required(:brand) => String.t() | nil,
          required(:category) => String.t() | nil,
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          required(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()],
          required(:default_serving_id) => String.t() | nil,
          required(:notes) => String.t() | nil,
          required(:source) => :system | :custom,
          required(:media) => EasyWeb.Types.Nutrition.FoodMedia.t() | nil,
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
          optional(:brand) => String.t() | nil,
          optional(:category) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          optional(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()],
          optional(:default_serving_id) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:media_id) => String.t() | nil
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:allergens) => [String.t()],
          optional(:dietary_tags) => [String.t()],
          optional(:tags) => [String.t()],
          optional(:brand) => String.t() | nil,
          optional(:category) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t(),
          optional(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()],
          optional(:default_serving_id) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          optional(:media_id) => String.t() | nil
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
  @spec format(Easy.Nutrition.Food.t()) :: t()
  def format(row) do
    row
    |> Map.take([
      :id,
      :name,
      :allergens,
      :dietary_tags,
      :tags,
      :brand,
      :category,
      :nutrients,
      :servings,
      :default_serving_id,
      :notes,
      :source,
      :media,
      :revision,
      :archived_at,
      :creator_id,
      :inserted_at,
      :updated_at
    ])
    |> Map.put(:media, if(row.media, do: Easy.LibraryMedia.public_representation(row.media), else: nil))
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
