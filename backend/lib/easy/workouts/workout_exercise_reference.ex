defmodule Easy.Workouts.WorkoutExerciseReference do
  use Ecto.Schema

  @primary_key false
  @foreign_key_type :binary_id

  schema "workout_exercises" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:workout, Easy.Workouts.Workout, primary_key: true)
    belongs_to(:exercise, Easy.Workouts.Exercise, primary_key: true)
  end
end
