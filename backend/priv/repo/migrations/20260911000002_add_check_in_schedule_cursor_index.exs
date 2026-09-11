defmodule Easy.Repo.Migrations.AddCheckInScheduleCursorIndex do
  use Ecto.Migration

  def change do
    create index(:check_in_schedules, [:business_id, :client_id, "inserted_at DESC", "id DESC"],
             name: :check_in_schedules_client_cursor_index
           )
  end
end
