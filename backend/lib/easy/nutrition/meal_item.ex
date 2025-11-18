defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_items" do
    field :sort_order, :integer, default: 0

    belongs_to :recipe, Easy.Nutrition.Recipe, type: :binary_id
    belongs_to :meal, Easy.Nutrition.Meal, type: :binary_id

    belongs_to :unit, Easy.Nutrition.MeasurementUnit, type: :binary_id

    timestamps()
  end

  def changeset(item, attrs) do
    item
    |> cast(attrs, [:sort_order, :recipe_id, :meal_id, :unit_id])
    |> validate_required([:recipe_id])
    |> validate_number(:sort_order, greater_than_or_equal_to: 0)
    # Ensure recipe is unique per meal to prevent accidental duplication
    |> unique_constraint([:meal_id, :recipe_id], name: :meal_recipe_unique_idx)
    |> foreign_key_constraint(:unit_id)
  end
end
