defmodule Easy.Repo.Migrations.AddChatMessageRequestIdentity do
  use Ecto.Migration

  def change do
    alter table(:chat_messages) do
      add :request_id, :binary_id
      add :request_fingerprint, :string
    end

    create unique_index(
             :chat_messages,
             [:business_id, :conversation_id, :sender_type, :sender_id, :request_id],
             name: :chat_messages_sender_request_index
           )

    create constraint(:chat_messages, :chat_messages_request_complete_check,
             check: "(request_id IS NULL) = (request_fingerprint IS NULL)"
           )
  end
end
