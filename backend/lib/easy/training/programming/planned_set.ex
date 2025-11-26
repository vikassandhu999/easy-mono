defmodule Easy.Training.Programming.PlannedSet do
  use Easy.Training.Schema

  alias Easy.Training.Programming.WorkoutElement

  schema "planned_sets" do
    field :position, :integer
    field :reps_min, :integer
    field :reps_max, :integer
    field :load_value, :decimal
    field :load_type, Ecto.Enum, values: [:absolute_kg, :percent_1rm, :rpe]
    field :rest_seconds, :integer

    belongs_to :workout_element, WorkoutElement

    timestamps()
  end

  @doc false
  def changeset(planned_set, attrs) do
    planned_set
    |> cast(attrs, [
      :position,
      :reps_min,
      :reps_max,
      :load_value,
      :load_type,
      :rest_seconds,
      :workout_element_id
    ])
    |> validate_required([:position, :workout_element_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:reps_min, greater_than: 0)
    |> validate_number(:reps_max, greater_than: 0)
    |> validate_number(:rest_seconds, greater_than_or_equal_to: 0)
    |> validate_rep_range()
    |> foreign_key_constraint(:workout_element_id)
  end

  defp validate_rep_range(changeset) do
    reps_min = get_field(changeset, :reps_min)
    reps_max = get_field(changeset, :reps_max)

    if reps_min && reps_max && reps_max < reps_min do
      add_error(changeset, :reps_max, "must be greater than or equal to reps_min")
    else
      changeset
    end
  end
end
