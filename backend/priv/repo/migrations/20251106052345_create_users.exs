defmodule Easy.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users) do
      add :email, :string, null: false
      add :full_name, :string, null: false
      add :email_verified, :boolean, default: false, null: false
      add :email_verified_at, :utc_datetime

      timestamps()
    end

    create unique_index(:users, [:email])
  end
end
