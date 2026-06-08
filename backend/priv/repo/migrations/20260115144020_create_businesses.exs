defmodule Easy.Repo.Migrations.CreateBusinesses do
  use Ecto.Migration

  def change do
    create table(:businesses, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :about, :string, default: ""
      add :handle, :string

      add :owner_id, references(:users, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:businesses, [:handle])
    create index(:businesses, [:owner_id])
  end
end
