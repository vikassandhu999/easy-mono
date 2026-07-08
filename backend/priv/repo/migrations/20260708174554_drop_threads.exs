defmodule Easy.Repo.Migrations.DropThreads do
  use Ecto.Migration

  def up do
    drop table(:thread_messages)
    drop table(:threads)
  end

  def down do
    raise "irreversible: threads feature was removed (never had a UI)"
  end
end
