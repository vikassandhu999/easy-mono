defmodule Easy.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :email, :string, null: false
      add :first_name, :string, null: false, default: ""
      add :last_name, :string, null: false, default: ""
      add :email_verified, :boolean, default: false, null: false
      add :email_verified_at, :utc_datetime

      timestamps()
    end

    create unique_index(:users, [:email])
  end
end
