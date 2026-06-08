defmodule Easy.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true, autogenerate: true
      add :email, :string, null: false
      add :first_name, :string, null: false, default: ""
      add :last_name, :string, null: false, default: ""
      add :email_confirmed_at, :utc_datetime, default: nil
      add :phone, :string, default: nil
      add :phone_confirmed_at, :utc_datetime, default: nil
      add :confirmation_sent_at, :utc_datetime, default: nil
      add :last_sign_in_at, :utc_datetime, default: nil

      timestamps()
    end

    create unique_index(:users, [:email], where: "email IS NOT NULL")
    create unique_index(:users, [:phone], where: "phone IS NOT NULL")
  end
end
