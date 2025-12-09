defmodule Easy.Training.Programming.PlannedWorkout do
  use Easy.Training.Schema

  alias Easy.Organizations.Business
  alias Easy.Training.Programming.{TrainingPlan, WorkoutElement}

  @doc """
  Day of week mapping:
  1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday,
  5 = Friday, 6 = Saturday, 7 = Sunday (ISO 8601 standard)
  """

  schema "planned_workouts" do
    field :name, :string
    field :notes, :string
    # Day of week: 1 (Monday) through 7 (Sunday)
    field :day_number, :integer

    belongs_to :business, Business
    belongs_to :training_plan, TrainingPlan

    has_many :workout_elements, WorkoutElement,
      preload_order: [asc: :position],
      on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(planned_workout, attrs) do
    planned_workout
    |> cast(attrs, [:name, :notes, :day_number])
    # business_id and training_plan_id are set by the context to enforce tenant isolation
    |> validate_required([:name, :day_number, :training_plan_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:day_number, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
    |> check_constraint(:day_number,
      name: :day_number_valid_weekday,
      message: "must be between 1 (Monday) and 7 (Sunday)"
    )
    |> foreign_key_constraint(:training_plan_id)
    |> foreign_key_constraint(:business_id)
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
