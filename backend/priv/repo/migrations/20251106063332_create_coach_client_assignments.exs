defmodule Easy.Repo.Migrations.CreateCoachClientAssignments do
  use Ecto.Migration

  def change do
    create table(:coach_client_assignments) do
      add :assigned_at, :utc_datetime, null: false
      add :assigned_by_id, :bigint
      add :coach_id, references(:coaches, on_delete: :delete_all), null: false
      add :client_id, references(:clients, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:coach_client_assignments, [:coach_id])
    create index(:coach_client_assignments, [:client_id])

    create unique_index(:coach_client_assignments, [:coach_id, :client_id],
             name: :coach_client_assignments_unique_index
           )
  end
end
