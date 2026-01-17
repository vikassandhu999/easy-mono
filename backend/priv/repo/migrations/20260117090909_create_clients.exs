defmodule Easy.Repo.Migrations.CreateClients do
  use Ecto.Migration

  def change do
    create table(:clients, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :first_name, :string, default: ""
      add :last_name, :string, default: ""
      add :phone, :string
      add :notes, :string
      add :status, :string, null: false
      add :invitation_token, :string
      add :invitation_sent_at, :utc_datetime

      add :user_id, references(:users, type: :binary_id, on_delete: :nothing)
      add :business_id, references(:businesses, type: :binary_id, on_delete: :nothing)
      add :creator_id, references(:coaches, type: :binary_id, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:clients, [:user_id, :business_id])
    create unique_index(:clients, [:business_id, :email])
    create index(:clients, [:business_id])
  end
end
