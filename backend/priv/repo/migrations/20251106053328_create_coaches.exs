defmodule Easy.Repo.Migrations.CreateCoaches do
  use Ecto.Migration

  def change do
    create table(:coaches) do
      add :bio, :text
      add :specialties, {:array, :string}
      add :credentials, :map
      add :status, :string, default: "active", null: false
      add :user_id, references(:users, on_delete: :nothing), null: false
      add :business_id, references(:businesses, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:coaches, [:user_id])
    create index(:coaches, [:business_id])
    create unique_index(:coaches, [:user_id, :business_id])
  end
end
