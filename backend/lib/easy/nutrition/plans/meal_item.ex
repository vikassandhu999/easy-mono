defmodule Easy.Nutrition.Library.MealItem do
  use Ecto.Schema
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Plans

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_items" do
    field :weight_g, :float
    field :amount, :float
    field :unit, :string

    belongs_to :recipe, Library.Recipe
    belongs_to :food, Library.Food
    belongs_to :meal, Plans.Meal

    timestamps(type: :utc_datetime)
  end
end
