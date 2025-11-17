defmodule Easy.Repo.Migrations.CreateMeasurementUnits do
  use Ecto.Migration

  def change do
    create table(:measurement_units, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :abbreviation, :string, null: false
      add :system, :string, null: false

      timestamps()
    end

    create unique_index(:measurement_units, [:name])
    create unique_index(:measurement_units, [:abbreviation])
  end
end
