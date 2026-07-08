defmodule Easy.Repo.Migrations.CreateChat do
  use Ecto.Migration

  def change do
    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false
      add :last_message_at, :utc_datetime_usec
      add :last_message_preview, :string
      add :coach_last_read_at, :utc_datetime_usec
      add :client_last_read_at, :utc_datetime_usec

      timestamps(type: :utc_datetime)
    end

    create unique_index(:conversations, [:business_id, :client_id])

    create table(:chat_messages, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :sender_type, :string, null: false
      add :sender_id, :binary_id, null: false
      add :body, :text, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:chat_messages, [:conversation_id, :inserted_at])

    create constraint(:chat_messages, :chat_messages_sender_type_check,
             check: "sender_type IN ('coach','client')"
           )
  end
end
