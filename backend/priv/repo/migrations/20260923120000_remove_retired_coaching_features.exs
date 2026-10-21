defmodule Easy.Repo.Migrations.RemoveRetiredCoachingFeatures do
  use Ecto.Migration

  def up do
    # Detach measurements before dropping submissions so their cascading foreign key
    # cannot remove historical weight records.
    alter table(:weight_entries) do
      remove :form_submission_id
    end

    drop table(:coach_next_steps)
    drop table(:form_submissions)
    drop table(:form_assignments)
    drop table(:check_in_schedules)
    drop table(:form_templates)
    drop table(:workbench_queue_snoozes)
    drop table(:prospects)
    drop table(:landing_programs)
    drop table(:landing_pages)

    alter table(:conversations) do
      remove :waiting_since
    end

    execute("""
    UPDATE chat_messages
    SET body = COALESCE(body, embed_snapshot->>'title', 'Shared record'),
        embed_type = NULL, embed_id = NULL, embed_snapshot = NULL
    WHERE embed_type = 'form_submission'
    """)

    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type IN ('training_session', 'meal', 'weight')"
           )
  end

  def down do
    raise "Retired feature data cannot be restored; restore the database backup to roll back."
  end
end
