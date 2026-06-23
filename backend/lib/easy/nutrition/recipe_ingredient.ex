defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition

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
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:food_id, :amount, :unit, :weight_g, :position])
    |> validate_required([:food_id, :weight_g])
    |> validate_number(:weight_g, greater_than: 0)
    |> check_constraint(:weight_g,
      name: :nutrition_recipe_ingredients_weight_positive,
      message: "must be greater than 0"
    )
  end
end
