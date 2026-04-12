defmodule Easy.Repo.Migrations.AddFoodsImportId do
  use Ecto.Migration

  def change do
    alter table(:foods) do
      add :import_id, :string
    end

    create unique_index(:foods, [:import_id],
             name: :foods_import_id_index,
             where: "import_id IS NOT NULL"
           )
  end
end
