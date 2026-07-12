defmodule Easy.Repo.Migrations.GeneralizeAttachmentsAndRichChat do
  use Ecto.Migration

  def up do
    drop constraint(:attachments, :attachments_purpose_check)

    alter table(:attachments) do
      remove :purpose
      add :duration_ms, :integer
    end

    create constraint(:attachments, :attachments_duration_ms_check,
             check: "duration_ms IS NULL OR duration_ms BETWEEN 1 AND 300000"
           )

    create unique_index(:attachments, [:id, :business_id])

    alter table(:chat_messages) do
      modify :body, :text, null: true
      add :embed_type, :string
      add :embed_id, :binary_id
      add :embed_snapshot, :map
    end

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type = 'form_submission'"
           )

    create constraint(:chat_messages, :chat_messages_embed_complete_check,
             check:
               "(embed_type IS NULL AND embed_id IS NULL AND embed_snapshot IS NULL) OR " <>
                 "(embed_type IS NOT NULL AND embed_id IS NOT NULL AND embed_snapshot IS NOT NULL)"
           )

    create unique_index(:chat_messages, [:id, :business_id])

    create table(:chat_message_attachments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :chat_message_id,
          references(:chat_messages,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :chat_message_attachments_message_business_id_fkey
          ),
          null: false

      add :attachment_id,
          references(:attachments,
            type: :binary_id,
            on_delete: :delete_all,
            with: [business_id: :business_id],
            name: :chat_message_attachments_attachment_business_id_fkey
          ),
          null: false

      add :position, :integer, null: false
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:chat_message_attachments, [:chat_message_id, :attachment_id])
    create unique_index(:chat_message_attachments, [:chat_message_id, :position])
    create index(:chat_message_attachments, [:business_id, :chat_message_id])
  end

  def down do
    drop table(:chat_message_attachments)
    drop unique_index(:chat_messages, [:id, :business_id])
    drop unique_index(:attachments, [:id, :business_id])
    drop constraint(:chat_messages, :chat_messages_embed_complete_check)
    drop constraint(:chat_messages, :chat_messages_embed_type_check)

    execute("UPDATE chat_messages SET body = '' WHERE body IS NULL")

    alter table(:chat_messages) do
      remove :embed_snapshot
      remove :embed_id
      remove :embed_type
      modify :body, :text, null: false
    end

    drop constraint(:attachments, :attachments_duration_ms_check)

    alter table(:attachments) do
      remove :duration_ms
      add :purpose, :string, null: false, default: "check_in_photo"
    end

    create constraint(:attachments, :attachments_purpose_check,
             check: "purpose = 'check_in_photo'"
           )
  end
end
