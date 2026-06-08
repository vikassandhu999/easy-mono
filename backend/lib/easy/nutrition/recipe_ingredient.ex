defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key false
  @foreign_key_type :binary_id

  schema "recipe_ingredients" do
    belongs_to :recipe, Nutrition.Recipe, primary_key: true
    belongs_to :food, Nutrition.Food, primary_key: true

    field :weight_g, :float
    field :amount, :float
    field :unit, :string

    timestamps(type: :utc_datetime)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(recipe_ingredient, attrs) do
    recipe_ingredient
    |> cast(attrs, [:food_id, :weight_g, :amount, :unit])
    |> validate_required([:food_id])
  end
end
