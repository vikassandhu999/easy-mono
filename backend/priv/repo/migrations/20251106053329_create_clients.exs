defmodule Easy.Repo.Migrations.CreateClients do
  use Ecto.Migration

  def change do
    create table(:clients) do
      add :email, :string, null: false
      add :full_name, :string, null: false
      add :phone, :string
      add :notes, :text
      add :status, :string, default: "pending", null: false
      add :user_id, references(:users, on_delete: :nothing)
      add :business_id, references(:businesses, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:clients, [:user_id])
    create index(:clients, [:business_id])
    create index(:clients, [:email])
    create unique_index(:clients, [:user_id, :business_id], where: "user_id IS NOT NULL", name: :clients_user_business_index)
  end
end
