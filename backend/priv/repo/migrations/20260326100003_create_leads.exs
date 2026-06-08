defmodule Easy.Repo.Migrations.CreateLeads do
  use Ecto.Migration

  def change do
    create table(:leads, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :email, :string, null: false
      add :phone, :string, null: false
      add :instagram_handle, :string
      add :intake_answers, :map, default: %{}
      add :status, :string, null: false, default: "new"
      add :notes, :text
      add :source, :string

      add :business_id, references(:businesses, type: :binary_id, on_delete: :delete_all),
        null: false

      add :offer_id, references(:offers, type: :binary_id, on_delete: :nothing)
      add :client_id, references(:clients, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:leads, [:business_id])
    create index(:leads, [:business_id, :status])
    create index(:leads, [:offer_id])
  end
end
