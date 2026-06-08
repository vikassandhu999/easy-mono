defmodule Easy.Repo.Migrations.CreateWeightEntries do
  use Ecto.Migration

  def change do
    create table(:weight_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :date, :date, null: false
      add :value, :decimal, precision: 5, scale: 2, null: false
      add :unit, :string, null: false
      add :note, :text

      add :client_id, references(:clients, type: :binary_id, on_delete: :delete_all), null: false

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:weight_entries, [:client_id, :date])
    create index(:weight_entries, [:business_id, :client_id, :date])
  end
end
