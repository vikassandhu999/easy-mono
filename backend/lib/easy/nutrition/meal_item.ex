defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_items" do
    field :servings, :decimal
    field :notes, :string

    belongs_to :meal, Easy.Nutrition.Meal
    belongs_to :recipe, Easy.Nutrition.Recipe

    timestamps()
  end

  def create_changeset(meal_recipe, attrs) do
    meal_recipe
    |> cast(attrs, [:meal_id, :recipe_id, :servings, :notes])
    |> validate_required([:meal_id, :recipe_id, :servings])
    |> validate_servings()
    |> foreign_key_constraint(:meal_id)
    |> foreign_key_constraint(:recipe_id)
    |> unique_constraint([:meal_id, :recipe_id],
      name: :meal_recipes_meal_id_recipe_id_index,
      message: "recipe already added to this meal"
    )
  end

  def update_changeset(meal_recipe, attrs) do
    meal_recipe
    |> cast(attrs, [:servings, :notes])
    |> validate_servings()
  end

  defp validate_servings(changeset) do
    case get_change(changeset, :servings) do
      nil ->
        changeset

      value ->
        if Decimal.compare(value, Decimal.new(0)) == :gt do
          changeset
        else
          add_error(changeset, :servings, "must be positive")
        end
    end
  end
end
