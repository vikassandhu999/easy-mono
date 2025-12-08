defmodule Easy.Repo.Migrations.AddHealthFieldsToClients do
  use Ecto.Migration

  def change do
    alter table(:clients) do
      add :height_cm, :integer
      add :weight_kg, :integer
      add :date_of_birth, :date
      add :sex, :string
      add :gender_identity, :string
      add :activity_level, :string
      add :goal, :string
      add :dietary_notes, :string
      add :injury_notes, :string
      add :medication_notes, :string
      add :measurement_system, :string
    end
  end
end
