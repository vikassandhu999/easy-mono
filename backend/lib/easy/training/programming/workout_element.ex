defmodule Easy.Training.Programming.WorkoutElement do
  use Easy.Training.Schema

  alias Easy.Organizations.Business
  alias Easy.Training.Programming.{PlannedWorkout, PlannedSet}
  alias Easy.Training.Library.Exercise

  schema "workout_elements" do
    field :position, :integer
    field :superset_group_id, :string
    field :notes, :string

    belongs_to :business, Business
    belongs_to :planned_workout, PlannedWorkout
    belongs_to :exercise, Exercise

    embeds_many :planned_sets, PlannedSet, on_replace: :delete

    timestamps()
  end

  @doc false
  def changeset(workout_element, attrs) do
    workout_element
    |> cast(attrs, [:position, :superset_group_id, :notes, :exercise_id])
    |> cast_embed(:planned_sets,
      with: &PlannedSet.changeset/2,
      sort_param: :planned_sets_sort,
      drop_param: :planned_sets_drop
    )
    |> validate_required([:position, :exercise_id, :planned_workout_id, :business_id])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint([:position, :planned_workout_id],
      name: :workout_elements_position_planned_workout_id_index
    )
    |> foreign_key_constraint(:planned_workout_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:business_id)
  end
end
