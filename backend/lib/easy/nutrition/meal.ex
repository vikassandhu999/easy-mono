defmodule Easy.Nutrition.Meal do
  use Easy.Nutrition.Schema

  alias Easy.Nutrition.{NutritionPlan, MealItem}

  @doc """
  Day of week mapping:
  1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday,
  5 = Friday, 6 = Saturday, 7 = Sunday (ISO 8601 standard)
  """

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

    # Day of week: 1 (Monday) through 7 (Sunday)
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
    |> validate_number(:day_number, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> check_constraint(:day_number,
      name: :day_number_valid_weekday,
      message: "must be between 1 (Monday) and 7 (Sunday)"
    )
    |> foreign_key_constraint(:nutrition_plan_id)
    |> cast_assoc(:meal_items, with: &MealItem.changeset/2)
  end

  @doc """
  Returns the day name for a given day number.
  """
  def day_name(1), do: "Monday"
  def day_name(2), do: "Tuesday"
  def day_name(3), do: "Wednesday"
  def day_name(4), do: "Thursday"
  def day_name(5), do: "Friday"
  def day_name(6), do: "Saturday"
  def day_name(7), do: "Sunday"
  def day_name(_), do: nil
end
