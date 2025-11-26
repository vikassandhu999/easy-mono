defmodule Easy.Training.Programming.WorkoutElement do
  use Easy.Training.Schema

  alias Easy.Training.Programming.{PlannedWorkout, PlannedSet}
  alias Easy.Training.Library.Exercise

  schema "workout_elements" do
    field :position, :integer
    field :superset_group_id, :string
    field :notes, :string

    belongs_to :planned_workout, PlannedWorkout
    belongs_to :exercise, Exercise

    has_many :planned_sets, PlannedSet,
      preload_order: [asc: :position],
      on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(workout_element, attrs) do
    workout_element
    |> cast(attrs, [:position, :superset_group_id, :notes, :planned_workout_id, :exercise_id])
    |> validate_required([:position, :exercise_id, :planned_workout_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint([:position, :planned_workout_id],
      name: :workout_elements_position_planned_workout_id_index
    )
    |> foreign_key_constraint(:planned_workout_id)
    |> foreign_key_constraint(:exercise_id)
  end
end
