defmodule Easy.Repo.Migrations.IndexConversationTenantIdentity do
  use Ecto.Migration

  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    create unique_index(:conversations, [:id, :business_id], concurrently: true)
  end
end
