defmodule Easy.Repo.Migrations.AddSystemExercisesUniqueIndex do
  use Ecto.Migration

  def change do
    alter table(:exercises) do
      add :import_id, :string
    end

    create unique_index(:exercises, [:import_id],
             name: :exercises_import_id_index,
             where: "import_id IS NOT NULL"
           )
  end
end
