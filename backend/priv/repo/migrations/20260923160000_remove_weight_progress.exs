defmodule Easy.Repo.Migrations.RemoveWeightProgress do
  use Ecto.Migration

  def up do
    execute("""
    UPDATE chat_messages
    SET body = COALESCE(body, embed_snapshot->>'title', 'Shared record'),
        embed_type = NULL, embed_id = NULL, embed_snapshot = NULL
    WHERE embed_type = 'weight'
    """)

    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type IN ('training_session', 'meal')"
           )

    drop table(:weight_entries)

    alter table(:clients) do
      remove :goal_weight_value
      remove :goal_weight_unit
    end
  end

  def down do
    raise "Retired weight progress data cannot be restored; restore the database backup to roll back."
  end
end
