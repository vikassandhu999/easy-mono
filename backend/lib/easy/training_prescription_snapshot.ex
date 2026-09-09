defmodule Easy.Training.PrescriptionSnapshot do
  alias Easy.Training.PlannedSet
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingWorkout

  @snapshot_version 1

  @spec build(TrainingPlan.t(), TrainingWorkout.t()) :: map()
  def build(plan, workout) do
    %{
      "version" => @snapshot_version,
      "plan" => %{"id" => plan.id, "name" => plan.name, "revision" => plan.revision},
      "workout" => %{
        "id" => workout.id,
        "name" => workout.name,
        "exercises" => Enum.map(workout.prescribed_exercises, &snapshot_exercise/1)
      }
    }
  end

  @spec validate_exercise_reference(Ecto.Changeset.t(), map() | nil) :: Ecto.Changeset.t()
  def validate_exercise_reference(changeset, snapshot) do
    reference = Ecto.Changeset.get_field(changeset, :snapshot_exercise_ref)

    references =
      snapshot
      |> get_in(["workout", "exercises"])
      |> List.wrap()
      |> Enum.map(&Map.get(&1, "ref"))

    if is_nil(reference) or reference in references do
      changeset
    else
      Ecto.Changeset.add_error(changeset, :snapshot_exercise_ref, "is not in the Training Session snapshot")
    end
  end

  defp snapshot_exercise(prescribed_exercise) do
    %{
      "ref" => prescribed_exercise.id,
      "position" => prescribed_exercise.position,
      "exercise_id" => prescribed_exercise.exercise_id,
      "exercise_name" => prescribed_exercise.exercise.name,
      "tracking_type" => prescribed_exercise.exercise.tracking_type,
      "sets" => Enum.map(prescribed_exercise.prescribed_sets, &PlannedSet.to_snapshot/1)
    }
  end
end
