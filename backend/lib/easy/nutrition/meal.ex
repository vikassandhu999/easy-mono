defmodule Easy.Nutrition.Meal do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meals" do
    field(:daytime, Ecto.Enum,
      values: [
        :early_morning,
        :breakfast,
        :lunch,
        :dinner,
        :pre_workout,
        :post_workout,
        :snack
      ]
    )

    field(:day_number, :integer)
    field(:label, :string)

    field(:time, :time)
    field(:notes, :string)

    field(:sort_order, :integer, default: 0)
    # cached_macros removed

    belongs_to(:nutrition_plan, Easy.Nutrition.NutritionPlan, type: :binary_id)

    has_many(:meal_items, Easy.Nutrition.MealItem,
      on_delete: :delete_all,
      preload_order: [asc: :sort_order]
    )

    timestamps()
  end

  def changeset(meal, attrs) do
    meal
    |> cast(attrs, [
      :daytime,
      :day_number,
      :label,
      :time,
      :notes,
      :nutrition_plan_id,
      :sort_order
    ])
    |> validate_required([:daytime, :day_number])
    |> cast_assoc(:meal_items, with: &Easy.Nutrition.MealItem.changeset/2)
  end
end
