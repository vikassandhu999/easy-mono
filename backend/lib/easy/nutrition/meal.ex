defmodule Easy.Nutrition.Meal do
  use Easy.Nutrition.Schema

  alias Easy.Nutrition.{NutritionPlan, MealItem}

  schema "meals" do
    field :daytime, Ecto.Enum,
      values: [
        :early_morning,
        :breakfast,
        :lunch,
        :dinner,
        :pre_workout,
        :post_workout,
        :snack
      ]

    field :day_number, :integer
    field :label, :string

    field :time, :time
    field :notes, :string

    field :position, :integer, default: 0

    belongs_to :nutrition_plan, NutritionPlan

    has_many :meal_items, MealItem,
      on_delete: :delete_all,
      preload_order: [asc: :position]

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
      :position,
      :nutrition_plan_id
    ])
    |> validate_required([:daytime, :day_number, :nutrition_plan_id])
    |> validate_number(:day_number, greater_than_or_equal_to: 0)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:nutrition_plan_id)
    |> cast_assoc(:meal_items, with: &MealItem.changeset/2)
  end

  @doc """
  Changeset that also validates day_number against plan duration.

  Use this when you have access to the nutrition plan and want to
  validate that day_number doesn't exceed the plan's total days.

  ## Parameters
    - meal: The meal struct
    - attrs: Attributes to change
    - plan: The NutritionPlan struct (must have duration_weeks loaded)
  """
  def changeset_with_plan(meal, attrs, %NutritionPlan{} = plan) do
    max_days = (plan.duration_weeks || 1) * 7

    meal
    |> changeset(attrs)
    |> validate_number(:day_number,
      less_than_or_equal_to: max_days,
      message: "must be between 1 and %{number} for this plan's duration"
    )
  end
end
