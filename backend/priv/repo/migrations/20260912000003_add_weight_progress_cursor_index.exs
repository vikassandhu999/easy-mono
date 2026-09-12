defmodule Easy.Repo.Migrations.AddWeightProgressCursorIndex do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:weight_entries, [:business_id, :client_id, :date, :inserted_at, :id],
             concurrently: true
           )
  end
end
