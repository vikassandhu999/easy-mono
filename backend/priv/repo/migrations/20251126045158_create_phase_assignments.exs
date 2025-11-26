defmodule Easy.Repo.Migrations.CreatePhaseAssignments do
  use Ecto.Migration

  def change do
    create table(:phase_assignments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :start_week, :integer, null: false
      add :end_week, :integer, null: false

      add :training_plan_id,
          references(:training_plans, type: :binary_id, on_delete: :delete_all),
          null: false

      add :phase_id, references(:phases, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:phase_assignments, [:training_plan_id])
    create index(:phase_assignments, [:phase_id])
    create index(:phase_assignments, [:start_week, :end_week])
  end
end
