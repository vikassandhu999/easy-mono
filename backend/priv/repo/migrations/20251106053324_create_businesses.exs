defmodule Easy.Repo.Migrations.CreateBusinesses do
  use Ecto.Migration

  def change do
    create table(:businesses) do
      add :name, :string, null: false
      add :description, :text
      add :slug, :string, null: false
      add :status, :string, default: "active", null: false
      add :owner_id, references(:users, on_delete: :nothing), null: false

      timestamps()
    end

    create unique_index(:businesses, [:name])
    create unique_index(:businesses, [:slug])
    create index(:businesses, [:owner_id])
  end
end
