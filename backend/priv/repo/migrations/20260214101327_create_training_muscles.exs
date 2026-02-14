defmodule Easy.Repo.Migrations.CreateTrainingMuscles do
  use Ecto.Migration

  def change do
    create table(:muscles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:muscles, [:name])
  end
end
