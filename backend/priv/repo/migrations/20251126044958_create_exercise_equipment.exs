defmodule Easy.Repo.Migrations.CreateExerciseEquipment do
  use Ecto.Migration

  def change do
    create table(:exercise_equipment, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :exercise_id, references(:exercises, type: :binary_id, on_delete: :delete_all),
        null: false

      add :equipment_id, references(:equipment, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:exercise_equipment, [:exercise_id, :equipment_id])
    create index(:exercise_equipment, [:equipment_id])
  end
end
