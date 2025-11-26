defmodule Easy.Training.Programming.PlannedWorkout do
  use Easy.Training.Schema

  alias Easy.Training.Programming.{Phase, WorkoutElement}

  schema "planned_workouts" do
    field :name, :string
    field :notes, :string
    field :day_of_week, :integer

    belongs_to :phase, Phase

    has_many :workout_elements, WorkoutElement,
      preload_order: [asc: :position],
      on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(planned_workout, attrs) do
    planned_workout
    |> cast(attrs, [:name, :notes, :day_of_week, :phase_id])
    |> validate_required([:name, :day_of_week, :phase_id])
    |> validate_number(:day_of_week, greater_than_or_equal_to: 1, less_than_or_equal_to: 7)
    |> unique_constraint([:phase_id, :day_of_week],
      name: :planned_workouts_phase_id_day_of_week_index
    )
    |> foreign_key_constraint(:phase_id)
  end
end
