defmodule Easy.Nutrition.Meal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meals" do
    field :daytime, Ecto.Enum,
      values: [
        :early_morning,
        :breakfast,
        :lunch,
        :dinner,
        :preworkout,
        :postworkout,
        :snack
      ]

    field :day_number, :integer
    field :label, :string

    field :time, :time
    field :notes, :string

    belongs_to :nutrition_plan, Easy.Nutrition.NutritionPlan, type: :binary_id

    has_many :meal_items, Easy.Nutrition.MealItem,
      # The FK on the MealItem table
      foreign_key: :meal_id,
      on_delete: :delete_all

    timestamps()
  end

  def changeset(meal, attrs) do
    meal
    |> cast(attrs, [:daytime, :day_number, :label, :time, :notes, :nutrition_plan_id])
    |> validate_required([:daytime, :day_number])
    |> cast_assoc(:meal_items, with: &Easy.Nutrition.MealItem.changeset/2)
  end
end
