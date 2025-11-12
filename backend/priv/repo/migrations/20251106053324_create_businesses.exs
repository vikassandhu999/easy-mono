defmodule Easy.Repo.Migrations.CreateBusinesses do
  use Ecto.Migration

  def change do
    create table(:businesses, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :string, null: false
      add :description, :text
      add :handle, :string, null: false
      add :status, :string, default: "active", null: false
      add :owner_id, references(:users, type: :uuid, on_delete: :nothing), null: false

      timestamps()
    end

    create unique_index(:businesses, [:handle])
    create index(:businesses, [:owner_id])

    alter table(:sessions) do
      modify :business_id, references(:businesses, type: :uuid, on_delete: :delete_all)
    end
  end
end
