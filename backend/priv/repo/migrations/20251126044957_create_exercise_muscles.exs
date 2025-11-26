defmodule Easy.Repo.Migrations.CreateExerciseMuscles do
  use Ecto.Migration

  def change do
    create table(:exercise_muscles, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :muscle_id, references(:muscles, type: :binary_id, on_delete: :delete_all), null: false
      add :role, :string, default: "primary", null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:exercise_muscles, [:exercise_id, :muscle_id])
    create index(:exercise_muscles, [:muscle_id])
    create index(:exercise_muscles, [:role])
  end
end
