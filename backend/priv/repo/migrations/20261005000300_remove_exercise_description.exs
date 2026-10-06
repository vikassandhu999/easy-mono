defmodule Easy.Repo.Migrations.RemoveExerciseDescription do
  use Ecto.Migration

  def change do
    alter table(:exercises), do: remove(:description, :text)
  end
end
