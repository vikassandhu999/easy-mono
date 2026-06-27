defmodule Easy.Repo.Migrations.AddSwappedFromToPerformedSets do
  use Ecto.Migration

  def change do
    alter table(:training_performed_sets) do
      # The planned exercise this set replaced, when the client swapped it mid-workout.
      # Plain id (no FK) — the original may be a system exercise; we only match it back
      # to the planned slot and read its name from the session's planned_snapshot.
      add :swapped_from_exercise_id, :binary_id
    end
  end
end
