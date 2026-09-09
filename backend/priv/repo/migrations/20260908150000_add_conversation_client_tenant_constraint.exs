defmodule Easy.Repo.Migrations.AddConversationClientTenantConstraint do
  use Ecto.Migration

  def up do
    execute "SET LOCAL lock_timeout = '5s'"

    execute """
    ALTER TABLE conversations
    ADD CONSTRAINT conversations_client_business_id_fkey
    FOREIGN KEY (client_id, business_id) REFERENCES clients(id, business_id)
    ON DELETE CASCADE NOT VALID
    """
  end

  def down do
    execute "SET LOCAL lock_timeout = '5s'"
    execute "ALTER TABLE conversations DROP CONSTRAINT conversations_client_business_id_fkey"
  end
end
