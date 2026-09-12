defmodule Easy.Repo.Migrations.AddTrainingSessionCursorIndex do
  use Ecto.Migration

  def change do
    create index(:training_sessions, [:business_id, :client_id, "inserted_at DESC", "id DESC"],
             name: :training_sessions_client_cursor_index
           )
  end
end
