defmodule Easy.Repo.Migrations.AddCoachesBusinessInsertedAtIndex do
  use Ecto.Migration

  def change do
    create index(:coaches, [:business_id, :inserted_at, :id])
  end
end
