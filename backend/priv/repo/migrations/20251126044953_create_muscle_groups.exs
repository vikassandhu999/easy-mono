defmodule Easy.Repo.Migrations.CreateMuscleGroups do
  use Ecto.Migration

  def change do
    create table(:muscle_groups, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:muscle_groups, [:name])
  end
end
