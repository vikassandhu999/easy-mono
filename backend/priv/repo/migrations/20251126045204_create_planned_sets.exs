defmodule Easy.Repo.Migrations.CreatePlannedSets do
  use Ecto.Migration

  def change do
    create table(:planned_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :position, :integer, null: false
      add :reps_min, :integer
      add :reps_max, :integer
      add :load_value, :decimal
      add :load_type, :string
      add :rest_seconds, :integer

      add :workout_element_id,
          references(:workout_elements, type: :binary_id, on_delete: :delete_all),
          null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:planned_sets, [:workout_element_id])
    create index(:planned_sets, [:position])
  end
end
