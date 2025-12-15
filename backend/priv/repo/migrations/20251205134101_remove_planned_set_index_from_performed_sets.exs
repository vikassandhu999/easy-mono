defmodule Easy.Repo.Migrations.RemovePlannedSetIndexFromPerformedSets do
  use Ecto.Migration

  def change do
    alter table(:performed_sets) do
      remove :planned_set_index, :integer
    end

    # Add index on exercise_id for querying exercise history across sessions
    create_if_not_exists index(:performed_sets, [:exercise_id])
  end
end
