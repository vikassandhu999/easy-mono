defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema
  alias Easy.Nutrition

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_items" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :meal, Nutrition.Meal

    timestamps(type: :utc_datetime)
  end
end
