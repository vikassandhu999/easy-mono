defmodule Easy.Repo.Migrations.CreateExercises do
  use Ecto.Migration

  def change do
    create table(:exercises, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text
      add :instructions, :text
      add :slug, :string
      add :mechanics, :string, null: false
      add :force, :string, null: false

      # Nullable for hybrid scope: null = system exercise, UUID = business-specific
      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all)

      timestamps(type: :utc_datetime_usec)
    end

    # Unique constraint allowing custom variants per business
    create unique_index(:exercises, [:name, :business_id],
             name: :exercises_name_business_id_index
           )

    create index(:exercises, [:business_id])
    create index(:exercises, [:slug])
    create index(:exercises, [:mechanics])
    create index(:exercises, [:force])
  end
end
