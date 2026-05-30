defmodule Easy.Repo.Migrations.CreateTrainingExerciseMuscles do
  use Ecto.Migration

  def change do
    create table(:exercise_muscles, primary_key: false) do
      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :muscle_id, references(:muscles, type: :binary_id, on_delete: :delete_all), null: false
    end

    create index(:exercise_muscles, [:exercise_id])
    create index(:exercise_muscles, [:muscle_id])
    create unique_index(:exercise_muscles, [:exercise_id, :muscle_id])
  end
end
