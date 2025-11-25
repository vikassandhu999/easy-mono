defmodule Easy.Repo.Migrations.CreateCoachClientAssignments do
  use Ecto.Migration

  def change do
    create table(:coach_client_assignments, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :assigned_at, :utc_datetime, null: false
      add :assigned_by_id, references(:users, type: :uuid, on_delete: :nilify_all)
      add :coach_id, references(:coaches, type: :uuid, on_delete: :delete_all), null: false
      add :client_id, references(:clients, type: :uuid, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:coach_client_assignments, [:coach_id])
    create index(:coach_client_assignments, [:client_id])

    create unique_index(:coach_client_assignments, [:coach_id, :client_id],
             name: :coach_client_assignments_unique_index
           )
  end
end
