defmodule Easy.Repo.Migrations.ValidateConversationClientTenantConstraint do
  use Ecto.Migration

  def up do
    execute "SET LOCAL lock_timeout = '5s'"
    execute "ALTER TABLE conversations VALIDATE CONSTRAINT conversations_client_business_id_fkey"
  end

  def down, do: :ok
end
