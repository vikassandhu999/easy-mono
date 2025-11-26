defmodule Easy.Repo.Migrations.CreateMuscles do
  use Ecto.Migration

  def change do
    create table(:muscles, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text

      add :muscle_group_id, references(:muscle_groups, type: :binary_id, on_delete: :restrict),
        null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:muscles, [:name])
    create index(:muscles, [:muscle_group_id])
  end
end
