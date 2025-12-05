defmodule Easy.Repo.Migrations.AddPlannedSetIndexToPerformedSets do
  use Ecto.Migration

  def change do
    alter table(:performed_sets) do
      add :planned_set_index, :integer
    end
  end
end
