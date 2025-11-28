defmodule Easy.Training.Programming.PlannedWorkout do
  use Easy.Training.Schema

  alias Easy.Training.Programming.{TrainingPlan, WorkoutElement}

  schema "planned_workouts" do
    field :name, :string
    field :notes, :string
    field :day_number, :integer

    belongs_to :training_plan, TrainingPlan

    has_many :workout_elements, WorkoutElement,
      preload_order: [asc: :position],
      on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(planned_workout, attrs) do
    planned_workout
    |> cast(attrs, [:name, :notes, :day_number, :training_plan_id])
    |> validate_required([:name, :day_number, :training_plan_id])
    |> validate_number(:day_number, greater_than_or_equal_to: 1)
    |> unique_constraint([:training_plan_id, :day_number],
      name: :planned_workouts_training_plan_id_day_number_index
    )
    |> foreign_key_constraint(:training_plan_id)
  end
end
