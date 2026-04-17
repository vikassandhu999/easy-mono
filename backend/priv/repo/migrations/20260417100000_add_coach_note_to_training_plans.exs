defmodule Easy.Repo.Migrations.AddCoachNoteToTrainingPlans do
  use Ecto.Migration

  def change do
    alter table(:training_plans) do
      add :coach_note, :text
    end
  end
end
