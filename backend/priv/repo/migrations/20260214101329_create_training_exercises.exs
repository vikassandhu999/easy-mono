defmodule Easy.Repo.Migrations.CreateTrainingExercises do
  use Ecto.Migration

  def change do
    create table(:exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :mechanics, :string
      add :force, :string
      add :images, {:array, :string}, default: []

      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:exercises, [:business_id])
    create unique_index(:exercises, [:name, :business_id])
  end
end
