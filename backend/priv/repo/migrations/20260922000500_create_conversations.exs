defmodule Easy.Repo.Migrations.CreateConversations do
  use Ecto.Migration

  def change do
    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id,
          references(:clients,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :conversations_client_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :last_message_at, :utc_datetime_usec
      add :last_message_preview, :string
      add :coach_last_read_at, :utc_datetime_usec
      add :client_last_read_at, :utc_datetime_usec
      add :last_message_role, :string
      add :waiting_since, :utc_datetime_usec

      timestamps(type: :utc_datetime)
    end

    create unique_index(:conversations, [:business_id, :client_id])

    create index(:conversations, [:business_id, "last_message_at DESC NULLS LAST"],
             name: :conversations_business_id_last_message_at_index
           )

    create unique_index(:conversations, [:id, :business_id])

    create index(
             :conversations,
             [:business_id, "(COALESCE(last_message_at, inserted_at)) DESC", "id DESC"],
             name: :conversations_inbox_cursor_index
           )

    create index(:conversations, [:business_id, :waiting_since, :id],
             name: :conversations_waiting_since_index,
             where: "waiting_since IS NOT NULL"
           )

    execute(
      """
      ALTER TABLE conversations ADD CONSTRAINT conversations_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id) ON DELETE CASCADE
      """,
      "ALTER TABLE conversations DROP CONSTRAINT conversations_client_id_fkey"
    )

    create table(:chat_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id,
          references(:conversations,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :chat_messages_conversation_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :sender_type, :string, null: false
      add :sender_id, :binary_id, null: false
      add :body, :text
      add :embed_type, :string
      add :embed_id, :binary_id
      add :embed_snapshot, :map
      add :request_id, :binary_id
      add :request_fingerprint, :string

      timestamps(type: :utc_datetime_usec)
    end

    create index(:chat_messages, [:business_id])
    create index(:chat_messages, [:conversation_id, :inserted_at])
    create index(:chat_messages, [:conversation_id, :sender_type, :inserted_at])
    create unique_index(:chat_messages, [:id, :business_id])

    create unique_index(
             :chat_messages,
             [:business_id, :conversation_id, :sender_type, :sender_id, :request_id],
             name: :chat_messages_sender_request_index
           )

    execute(
      """
      ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES conversations(id) ON DELETE CASCADE
      """,
      "ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_conversation_id_fkey"
    )

    create constraint(:chat_messages, :chat_messages_embed_complete_check,
             check: """
             (embed_type IS NULL AND embed_id IS NULL AND embed_snapshot IS NULL)
             OR (embed_type IS NOT NULL AND embed_id IS NOT NULL AND embed_snapshot IS NOT NULL)
             """
           )

    create constraint(:chat_messages, :chat_messages_embed_type_check,
             check: "embed_type IS NULL OR embed_type = 'form_submission'"
           )

    create constraint(:chat_messages, :chat_messages_request_complete_check,
             check: "(request_id IS NULL) = (request_fingerprint IS NULL)"
           )

    create constraint(:chat_messages, :chat_messages_sender_type_check,
             check: "sender_type IN ('coach','client')"
           )

    create table(:chat_message_attachments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :chat_message_id,
          references(:chat_messages,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :chat_message_attachments_message_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :attachment_id,
          references(:attachments,
            type: :binary_id,
            with: [business_id: :business_id],
            name: :chat_message_attachments_attachment_business_id_fkey,
            on_delete: :delete_all
          ),
          null: false

      add :position, :integer, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:chat_message_attachments, [:business_id, :chat_message_id])
    create unique_index(:chat_message_attachments, [:chat_message_id, :attachment_id])

    create unique_index(:chat_message_attachments, [:chat_message_id, :position],
             name: :chat_message_attachments_chat_message_id_position_index
           )
  end
end
