defmodule Easy.Repo.Migrations.RequireWorkoutElementExercise do
  use Ecto.Migration

  # `training_workout_exercises.exercise_id` was nilify-on-delete with nothing
  # requiring it, so deleting an exercise silently left plan rows pointing at
  # nothing: the element kept its planned_sets, the session snapshot recorded
  # "name" => nil, and the client was prescribed sets of a nameless movement.
  # insert_changeset required an exercise; update and delete did not — the
  # invariant was guarded at one door out of three.
  #
  # Deliberately `:restrict`, not NOT NULL over a nilify FK: SET NULL runs as an
  # UPDATE and would then trip the NOT NULL, turning every delete into a raise
  # (RM-019). Restrict refuses the delete outright, and the context checks first
  # so the coach gets {:error, :in_use} -> 409 rather than a constraint error.
  def up do
    # An element with no exercise cannot be rendered, edited, or logged against.
    execute("DELETE FROM training_workout_exercises WHERE exercise_id IS NULL")

    alter table(:training_workout_exercises) do
      modify :exercise_id,
             references(:training_exercises, type: :binary_id, on_delete: :restrict),
             null: false,
             from: references(:training_exercises, type: :binary_id, on_delete: :nilify_all)
    end
  end

  def down do
    alter table(:training_workout_exercises) do
      modify :exercise_id,
             references(:training_exercises, type: :binary_id, on_delete: :nilify_all),
             null: true,
             from: references(:training_exercises, type: :binary_id, on_delete: :restrict)
    end
  end
end
