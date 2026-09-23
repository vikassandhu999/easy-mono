defmodule Easy.Repo.Migrations.ActivityPublication do
  use Ecto.Migration

  def up do
    alter table(:nutrition_diary_slots) do
      add :shared_at, :utc_datetime
      add :note_to_coach, :text
    end

    execute("ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_embed_type_check")

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check:
               "embed_type IS NULL OR embed_type IN ('form_submission', 'training_session', 'meal', 'weight')"
           )
  end

  def down do
    execute(
      "UPDATE chat_messages SET embed_type = NULL, embed_id = NULL, embed_snapshot = NULL WHERE embed_type <> 'form_submission'"
    )

    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type = 'form_submission'"
           )

    alter table(:nutrition_diary_slots) do
      remove :shared_at
      remove :note_to_coach
    end
  end
end
