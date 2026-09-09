defmodule Easy.Repo.Migrations.AddMessageConversationTenantConstraint do
  use Ecto.Migration

  def up do
    execute "SET LOCAL lock_timeout = '5s'"

    execute """
    ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_conversation_business_id_fkey
    FOREIGN KEY (conversation_id, business_id) REFERENCES conversations(id, business_id)
    ON DELETE CASCADE NOT VALID
    """
  end

  def down do
    execute "SET LOCAL lock_timeout = '5s'"

    execute "ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_conversation_business_id_fkey"
  end
end
