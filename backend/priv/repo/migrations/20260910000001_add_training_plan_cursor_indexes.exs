defmodule Easy.Repo.Migrations.AddTrainingPlanCursorIndexes do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:training_plans, [:business_id, :kind, :inserted_at, :id], concurrently: true)

    create index(:training_plans, [:business_id, :client_id, :inserted_at, :id],
             concurrently: true
           )
  end
end
