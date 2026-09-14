defmodule Easy.Repo.Migrations.AddConversationInboxCursorIndex do
  use Ecto.Migration

  def change do
    create index(
             :conversations,
             [
               :business_id,
               "(COALESCE(last_message_at, inserted_at)) DESC",
               "id DESC"
             ],
             name: :conversations_inbox_cursor_index
           )
  end
end
