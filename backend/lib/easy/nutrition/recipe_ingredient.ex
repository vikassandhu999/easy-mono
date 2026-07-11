defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition
  alias Easy.Orgs.Business

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_recipe_ingredients" do
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
    field :position, :integer, default: 0

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :business, Business
  end

  @spec update_changeset(t(), String.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe_ingredient, business_id, attrs) do
    recipe_ingredient
    |> cast(attrs, [:food_id, :amount, :unit, :weight_g, :position])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :food_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> check_constraint(:weight_g,
      name: :nutrition_recipe_ingredients_weight_positive,
      message: "must be greater than 0"
    )
  end
end
