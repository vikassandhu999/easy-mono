defmodule Easy.Repo.Migrations.CreateEquipment do
  use Ecto.Migration

  def change do
    create table(:equipment, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :description, :text

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:equipment, [:name])
  end
end
