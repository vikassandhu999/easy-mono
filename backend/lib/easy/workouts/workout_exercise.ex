defmodule Easy.Workouts.WorkoutExercise do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, RoundTargets}

  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:exercise_id, :binary_id)
    field(:exercise, :map, virtual: true)

    field(:side_mode, Ecto.Enum,
      values: [:combined, :per_side],
      default: :combined
    )

    field(:targets_mode, Ecto.Enum,
      values: [:same_for_all, :per_round],
      default: :same_for_all
    )

    embeds_many(:targets, Easy.Workouts.RoundTargets, on_replace: :delete)
  end

  @spec changeset(t(), map(), Exercise.t(), pos_integer()) :: Ecto.Changeset.t()
  def changeset(workout_exercise, attrs, %Exercise{} = exercise, rounds) do
    workout_exercise
    |> cast(attrs, [:exercise_id, :side_mode, :targets_mode], empty_values: [])
    |> validate_required([:exercise_id, :side_mode, :targets_mode])
    |> validate_exercise_reference(exercise)
    |> RoundTargets.cast_many(exercise, rounds)
  end

  defp validate_exercise_reference(changeset, exercise) do
    if not is_nil(exercise.id) and get_field(changeset, :exercise_id) == exercise.id,
      do: changeset,
      else: add_error(changeset, :exercise_id, "must match the resolved exercise")
  end
end
