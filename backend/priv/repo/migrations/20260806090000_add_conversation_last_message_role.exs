defmodule Easy.Repo.Migrations.AddConversationLastMessageRole do
  use Ecto.Migration

  def up do
    alter table(:conversations) do
      add :last_message_role, :string
    end

    execute """
    UPDATE conversations AS c
    SET last_message_role = m.sender_type
    FROM (
      SELECT DISTINCT ON (conversation_id) conversation_id, sender_type
      FROM chat_messages
      ORDER BY conversation_id, inserted_at DESC, id DESC
    ) AS m
    WHERE m.conversation_id = c.id
    """
  end

  def down do
    alter table(:conversations) do
      remove :last_message_role
    end
  end
end
