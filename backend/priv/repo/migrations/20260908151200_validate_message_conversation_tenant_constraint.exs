defmodule Easy.Repo.Migrations.ValidateMessageConversationTenantConstraint do
  use Ecto.Migration

  def up do
    execute "SET LOCAL lock_timeout = '5s'"

    execute "ALTER TABLE chat_messages VALIDATE CONSTRAINT chat_messages_conversation_business_id_fkey"
  end

  def down, do: :ok
end
