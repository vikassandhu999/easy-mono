defmodule Easy.MealPlans.MealPlanMeal do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "meal_plan_meals" do
    field :day_offset, :integer
    field :label, :string
    field :meal_time_window_start, :time
    field :meal_time_window_end, :time

    belongs_to :meal_plan, Easy.MealPlans.Plan, type: :binary_id
    belongs_to :meal, Easy.Nutrition.Meal, type: :binary_id

    timestamps()
  end

  @required_fields ~w(meal_plan_id meal_id day_offset)a
  @optional_fields ~w(label meal_time_window_start meal_time_window_end)a

  def changeset(meal_plan_meal, attrs) do
    meal_plan_meal
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_number(:day_offset, greater_than_or_equal_to: 0)
    |> validate_length(:label, max: 255)
    |> validate_time_window()
    |> foreign_key_constraint(:meal_plan_id)
    |> foreign_key_constraint(:meal_id)
    |> unique_constraint([:meal_plan_id, :meal_id, :day_offset],
      name: :meal_plan_meals_meal_plan_id_meal_id_day_offset_index,
      message: "meal already exists for this day in the plan"
    )
  end

  def create_changeset(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
  end

  def update_changeset(meal_plan_meal, attrs) do
    meal_plan_meal
    |> changeset(attrs)
  end

  def update_time_window_changeset(meal_plan_meal, attrs) do
    meal_plan_meal
    |> cast(attrs, [:meal_time_window_start, :meal_time_window_end])
    |> validate_required([:meal_time_window_start, :meal_time_window_end])
    |> validate_time_window()
  end

  def update_day_changeset(meal_plan_meal, day_offset) do
    meal_plan_meal
    |> change(day_offset: day_offset)
    |> validate_required([:day_offset])
    |> validate_number(:day_offset, greater_than_or_equal_to: 0)
  end

  def get_meal_time_label(meal_plan_meal) do
    cond do
      meal_plan_meal.label && String.trim(meal_plan_meal.label) != "" ->
        meal_plan_meal.label

      meal_plan_meal.meal_time_window_start ->
        infer_meal_label_from_time(meal_plan_meal.meal_time_window_start)

      true ->
        "Meal"
    end
  end

  def day_number(meal_plan_meal) do
    meal_plan_meal.day_offset + 1
  end

  defp validate_time_window(changeset) do
    start_time = get_field(changeset, :meal_time_window_start)
    end_time = get_field(changeset, :meal_time_window_end)

    cond do
      is_nil(start_time) or is_nil(end_time) ->
        changeset

      Time.compare(end_time, start_time) != :gt ->
        add_error(changeset, :meal_time_window_end, "must be after start time")

      true ->
        changeset
    end
  end

  defp infer_meal_label_from_time(time) do
    hour = time.hour

    cond do
      hour >= 5 and hour < 11 -> "Breakfast"
      hour >= 11 and hour < 15 -> "Lunch"
      hour >= 15 and hour < 18 -> "Snack"
      hour >= 18 or hour < 5 -> "Dinner"
      true -> "Meal"
    end
  end
end
