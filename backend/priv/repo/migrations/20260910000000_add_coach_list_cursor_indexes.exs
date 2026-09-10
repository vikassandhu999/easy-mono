defmodule Easy.Repo.Migrations.AddCoachListCursorIndexes do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create index(:clients, [:business_id, :inserted_at, :id], concurrently: true)
    create index(:form_templates, [:business_id, :inserted_at, :id], concurrently: true)
  end
end
